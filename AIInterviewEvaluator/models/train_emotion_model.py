import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, SubsetRandomSampler
from models.emotion_cnn import EmotionCNN
from collections import Counter
import numpy as np
import time
from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
import os

# Define transformations
transform = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((48, 48)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

# Load dataset
data_dir = '/Users/abderrahim_boussyf/AIInterviewEvaluator/data/emotion/train'
dataset = datasets.ImageFolder(data_dir, transform=transform)

# Split dataset into train and validation (80-20 split)
indices = list(range(len(dataset)))
np.random.shuffle(indices)
train_size = int(0.8 * len(dataset))
train_indices, val_indices = indices[:train_size], indices[train_size:]

train_sampler = SubsetRandomSampler(train_indices)
val_sampler = SubsetRandomSampler(val_indices)

# DataLoaders
train_loader = DataLoader(dataset, batch_size=32, sampler=train_sampler)  # Reduced batch size
val_loader = DataLoader(dataset, batch_size=32, sampler=val_sampler)

# Class distribution and weights
labels = [dataset[i][1] for i in range(len(dataset))]
class_counts = Counter(labels)
print("Class Distribution (Train + Val):", class_counts)
num_classes = len(class_counts)
num_samples = len(labels)
class_weights = torch.tensor([num_samples / class_counts.get(i, num_samples) for i in range(num_classes)], dtype=torch.float32)

# Initialize model, loss, and optimizer
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = EmotionCNN(num_classes=num_classes).to(device)
criterion = nn.CrossEntropyLoss(weight=class_weights)
optimizer = optim.Adam(model.parameters(), lr=0.005)  # Increased learning rate
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50)

# Model saving
best_val_loss = float('inf')
patience = 10
counter = 0
best_model_path = '/Users/abderrahim_boussyf/AIInterviewEvaluator/src/emotion_model.pth'

# Training loop
num_epochs = 50
for epoch in range(num_epochs):
    model.train()
    train_loss = 0
    start_time = time.time()
    batch_count = 0
    for batch_idx, (images, labels) in enumerate(train_loader):
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        train_loss += loss.item()
        batch_count += 1
        if batch_idx % 10 == 0:
            elapsed_time = time.time() - start_time
            print(f"Epoch {epoch + 1}, Batch {batch_idx}, Time: {elapsed_time:.2f}s, Batch Size: {images.size(0)}")

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
        for batch_idx, (images, labels) in enumerate(val_loader):
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            val_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            batch_count += 1
            if batch_idx % 10 == 0:
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
        emotion_labels = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=emotion_labels[:num_classes],
                    yticklabels=emotion_labels[:num_classes])
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

print(f"Model trained and saved at {best_model_path}.")