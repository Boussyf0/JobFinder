import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchaudio
import torchaudio.transforms as T
import librosa
import numpy as np
from collections import Counter
import os
from models.speech_rnn import SpeechRNN
import time
from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# Custom Audio Dataset
class AudioEmotionDataset(Dataset):
    def __init__(self, audio_files, labels, sample_rate=16000):
        self.audio_files = audio_files
        self.labels = labels
        self.sample_rate = sample_rate
        self.mfcc_transform = T.MFCC(
            sample_rate=sample_rate,
            n_mfcc=13,
            melkwargs={
                'n_fft': 512,
                'n_mels': 64,
                'f_min': 0.0,
                'f_max': sample_rate / 2,
                'hop_length': 256
            }
        )

    def __len__(self):
        return len(self.audio_files)

    def __getitem__(self, idx):
        audio_path = self.audio_files[idx]
        label = self.labels[idx]
        try:
            waveform, sample_rate = torchaudio.load(audio_path)
            print(f"Loaded {audio_path}, shape: {waveform.shape}, sample_rate: {sample_rate}")

            if waveform.shape[0] > 1:
                waveform = torch.mean(waveform, dim=0, keepdim=True)
            if sample_rate != self.sample_rate:
                resampler = T.Resample(sample_rate, self.sample_rate)
                waveform = resampler(waveform)
            waveform = waveform / torch.max(torch.abs(waveform))

            # Convert to numpy for augmentation
            waveform_np = waveform.detach().numpy().squeeze()

            # Augmentation
            if torch.rand(1) > 0.5:  # Noise
                noise = torch.randn_like(waveform) * 0.01
                waveform_np = waveform_np + noise.detach().numpy().squeeze()
            if torch.rand(1) > 0.5:  # Pitch Shift
                if waveform.shape[1] < 100:  # Avoid processing very short audio
                    print(f"Skipping pitch shift for {audio_path}: too short ({waveform.shape[1]} samples)")
                else:
                    try:
                        pitch_shift = T.PitchShift(sample_rate=self.sample_rate, n_steps=torch.randint(-2, 3, (1,)).item())
                        waveform = pitch_shift(waveform)
                        waveform_np = waveform.detach().numpy().squeeze()
                    except Exception as e:
                        print(f"Error applying pitch shift to {audio_path}: {e}")
                        waveform_np = waveform.detach().numpy().squeeze()  # Fallback to original
            if torch.rand(1) > 0.5:  # Time Stretch using librosa
                stretch_rate = 1.0 + torch.rand(1).item() * 0.2 - 0.1  # Between 0.9 and 1.1
                waveform_np = librosa.effects.time_stretch(waveform_np, rate=stretch_rate)

            # Convert back to tensor
            waveform = torch.tensor(waveform_np).unsqueeze(0)

            mfcc = self.mfcc_transform(waveform)
            print(f"Processed {audio_path}, MFCC shape: {mfcc.shape}")
            return mfcc, label
        except Exception as e:
            print(f"Error loading {audio_path}: {e}")
            return None, None

    @staticmethod
    def collate_fn(batch):
        batch = [item for item in batch if item[0] is not None and item[1] is not None]
        if not batch:
            return torch.zeros(1, 13, 1), torch.zeros(1, dtype=torch.long)

        mfccs, labels = zip(*batch)
        max_length = max(mfcc.shape[2] for mfcc in mfccs)
        padded_mfccs = [torch.nn.functional.pad(mfcc, (0, max_length - mfcc.shape[2])) for mfcc in mfccs]
        mfccs_batch = torch.stack(padded_mfccs).squeeze(1).permute(0, 2, 1)  # [batch, max_length, 13]
        return mfccs_batch, torch.tensor(labels)

# Load Audio Data
def load_audio_data(data_dir):
    audio_files = []
    labels = []
    emotion_map = {
        '01': 0,  # neutral
        '02': 1,  # calm
        '03': 2,  # happy
        '04': 3,  # sad
        '05': 4,  # angry
        '06': 5,  # fearful
        '07': 6,  # disgust
        '08': 7   # surprised
    }
    if not os.path.exists(data_dir):
        print(f"Directory {data_dir} does not exist.")
        return [], []

    for root, _, files in os.walk(data_dir):
        for filename in files:
            if filename.endswith(('.wav', '.mp3')):
                parts = filename.split('-')
                if len(parts) > 2:
                    emotion_code = parts[2]
                    if emotion_code in emotion_map:
                        audio_files.append(os.path.join(root, filename))
                        labels.append(emotion_map[emotion_code])
                    else:
                        print(f"Unknown label for {filename}: {emotion_code}")
                else:
                    print(f"Invalid file format: {filename}")
    return audio_files, labels

# Paths
data_dir = '/Users/abderrahim_boussyf/AIInterviewEvaluator/data/speech/train/audio_speech_actors_01-24'
audio_files, labels = load_audio_data(data_dir)

# Split Train/Validation
train_size = int(0.8 * len(audio_files))
train_files, train_labels = audio_files[:train_size], labels[:train_size]
val_files, val_labels = audio_files[train_size:], labels[train_size:]

print("Class Distribution (Train):", Counter(train_labels))
print("Class Distribution (Val):", Counter(val_labels))

# Compute Class Weights
class_counts = Counter(train_labels)
num_samples = len(train_labels)
class_weights = torch.tensor([num_samples / class_counts.get(i, num_samples) for i in range(8)], dtype=torch.float32)

# Initialize Dataset
train_dataset = AudioEmotionDataset(train_files, train_labels)
val_dataset = AudioEmotionDataset(val_files, val_labels)

# DataLoaders (Increase batch size slightly)
train_loader = DataLoader(train_dataset, batch_size=24, shuffle=True, collate_fn=AudioEmotionDataset.collate_fn)
val_loader = DataLoader(val_dataset, batch_size=24, shuffle=False, collate_fn=AudioEmotionDataset.collate_fn)

# Model with Dropout
class SpeechRNN(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes, dropout=0.3):
        super(SpeechRNN, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, bidirectional=True, dropout=dropout)
        self.fc1 = nn.Linear(hidden_size * 2, 256)
        self.fc2 = nn.Linear(256, num_classes)
        self.dropout = nn.Dropout(dropout)
        self.relu = nn.ReLU()

    def forward(self, x):
        h0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.dropout(out[:, -1, :])
        out = self.relu(self.fc1(out))
        out = self.dropout(out)
        out = self.fc2(out)
        return out

# Model
input_size = 13
hidden_size = 128
num_layers = 2
num_classes = 8
model = SpeechRNN(input_size, hidden_size, num_layers, num_classes, dropout=0.3)

# Optimizer, Loss, Scheduler
optimizer = optim.Adam(model.parameters(), lr=0.005)  # Increased learning rate
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50)
criterion = nn.CrossEntropyLoss(weight=class_weights)

# Model Saving
best_val_loss = float('inf')
patience = 10
counter = 0
best_model_path = '/Users/abderrahim_boussyf/AIInterviewEvaluator/src/speech_model.pth'

# Training Loop with Confusion Matrix
num_epochs = 100
for epoch in range(num_epochs):
    model.train()
    train_loss = 0
    start_time = time.time()
    batch_count = 0
    for batch_idx, batch in enumerate(train_loader):
        inputs, labels = batch
        if inputs is None or labels is None:
            print(f"Skipping batch {batch_idx} due to None values")
            continue
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        train_loss += loss.item()
        batch_count += 1
        if batch_idx % 2 == 0:
            elapsed_time = time.time() - start_time
            print(f"Epoch {epoch + 1}, Batch {batch_idx}, Time: {elapsed_time:.2f}s, Batch Size: {inputs.size(0)}")

        if elapsed_time > 300 and batch_idx < len(train_loader) // 2:
            print(f"Warning: Epoch {epoch + 1} taking too long ({elapsed_time:.2f}s), consider interrupting.")
            break

    train_loss /= batch_count if batch_count > 0 else 1
    print(f"Epoch {epoch + 1} Training Time: {time.time() - start_time:.2f}s")

    # Validation
    model.eval()
    val_loss = 0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    start_time = time.time()
    batch_count = 0
    with torch.no_grad():
        for batch_idx, batch in enumerate(val_loader):
            inputs, labels = batch
            if inputs is None or labels is None:
                print(f"Skipping batch {batch_idx} due to None values")
                continue
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            val_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            batch_count += 1
            if batch_idx % 2 == 0:
                elapsed_time = time.time() - start_time
                print(f"Epoch {epoch + 1} Validation, Batch {batch_idx}, Time: {elapsed_time:.2f}s")

    val_loss /= batch_count if batch_count > 0 else float('inf')
    val_accuracy = 100 * correct / total if total > 0 else 0.0
    print(f"Epoch {epoch + 1} Validation Time: {time.time() - start_time:.2f}s")

    print(f"Epoch {epoch + 1}/{num_epochs}, Train Loss: {train_loss:.4f}, "
          f"Val Loss: {val_loss:.4f}, Val Accuracy: {val_accuracy:.2f}%")

    # Confusion Matrix every 5 epochs
    if (epoch + 1) % 5 == 0:
        cm = confusion_matrix(all_labels, all_preds)
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"],
                    yticklabels=["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"])
        plt.title(f'Confusion Matrix at Epoch {epoch + 1}')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.savefig(f'confusion_matrix_epoch_{epoch + 1}.png')
        plt.close()

    scheduler.step()
    if val_loss < best_val_loss:
        best_val_loss = val_loss
        torch.save(model.state_dict(), best_model_path)
        counter = 0
    else:
        counter += 1
    if counter >= patience:
        print("Early stopping triggered.")
        break

print(f"Speech model trained and saved at {best_model_path}.")