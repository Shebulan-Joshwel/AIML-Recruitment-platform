import sys
import os
from pathlib import Path
import random

# Add backend to sys.path so we can import our modules
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent.parent.parent
sys.path.append(str(backend_dir))

# Mock Django setup for standalone script
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from apps.job_management.aiml_core.scoring_model import Features, train_scoring_model

def generate_synthetic_data(n=200):
    features = []
    labels = []
    
    for _ in range(n):
        is_match = random.random() > 0.5
        
        if is_match:
            # Good match: high similarity, high coverage
            sim = random.uniform(0.6, 0.9)
            coverage = random.uniform(0.5, 1.0)
            label = 1
        else:
            # Poor match: low similarity, low coverage
            sim = random.uniform(0.1, 0.5)
            coverage = random.uniform(0.0, 0.4)
            label = 0
            
        features.append(Features(sim=sim, coverage=coverage))
        labels.append(label)
        
    return features, labels

def main():
    print("Generating synthetic dataset (200 samples)...")
    features, labels = generate_synthetic_data(200)
    
    model_path = current_dir.parent / "models" / "scoring_lr.pkl"
    print(f"Training Logistic Regression model...")
    
    train_scoring_model(features, labels, model_path)
    
    print(f"✅ Success! Model saved to: {model_path}")
    print("The project will now use this trained model to rescore candidates.")

if __name__ == "__main__":
    main()
