# models/emotion_cnn.py
import torch
import torch.nn as nn
import torch.nn.functional as F

class EmotionCNN(nn.Module):
    def __init__(self):
        super(EmotionCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(128, 256, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(0.5)
        self.fc1 = nn.Linear(256 * 6 * 6, 512)
        self.fc2 = nn.Linear(512, 7)

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))  # [1, 224, 224] -> [64, 112, 112]
        x = self.pool(F.relu(self.conv2(x)))  # [64, 112, 112] -> [128, 56, 56]
        x = self.pool(F.relu(self.conv3(x)))  # [128, 56, 56] -> [256, 28, 28]
        x = self.pool(x)                     # [256, 28, 28] -> [256, 14, 14]
        x = F.adaptive_avg_pool2d(x, (6, 6)) # [256, 14, 14] -> [256, 6, 6]
        x = x.view(-1, 256 * 6 * 6)          # Aplatir : 256 * 6 * 6 = 9216
        x = self.dropout(F.relu(self.fc1(x)))
        x = self.fc2(x)
        return x