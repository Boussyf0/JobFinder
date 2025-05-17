#!/usr/bin/env python3
import joblib
import pandas as pd

def load_model():
    return joblib.load('adzuna_data/models/salary_predictor.pkl')

def predict_salary(model, title, department, experience_years, is_remote, location=None):
    # Create a sample DataFrame with all necessary columns
    sample_data = {
        'dept_category': [department],
        'job_type': ['full_time'],
        'experience_years': [experience_years if not pd.isna(experience_years) else 0],
        'is_remote': [1 if is_remote else 0],
        'is_hybrid': [0],
        'is_fulltime': [1],
        'is_contract': [0],
        'skills_count': [5],  # Default value
        'is_senior': [1 if 'senior' in title.lower() or 'lead' in title.lower() else 0],
        'is_junior': [1 if 'junior' in title.lower() or 'assistant' in title.lower() else 0],
        'is_manager': [1 if 'manager' in title.lower() or 'director' in title.lower() else 0]
    }
    
    # Create DataFrame
    job_df = pd.DataFrame(sample_data)
    
    # Make prediction
    try:
        return model.predict(job_df)[0]
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return 0

if __name__ == "__main__":
    model = load_model()
    
    # Sample predictions
    print("\nSalary Prediction Tool")
    print("====================")
    
    # Get user input
    title = input("Enter job title: ")
    department = input("Enter department (e.g., IT & Technology, Marketing): ")
    experience = float(input("Enter years of experience: "))
    remote = input("Remote job? (y/n): ").lower() == 'y'
    
    predicted = predict_salary(model, title, department, experience, remote)
    print(f"\nPredicted salary: {predicted:,.2f}")
    
    # Show some examples
    print("\nSample Predictions:")
    print(f"Junior Developer (0 years, remote): " +
          f"{predict_salary(model, 'Junior Developer', 'IT & Technology', 0, True):,.2f}")
    print(f"Senior Developer (5 years, onsite): " +
          f"{predict_salary(model, 'Senior Developer', 'IT & Technology', 5, False):,.2f}")
    print(f"Marketing Manager (3 years, hybrid): " +
          f"{predict_salary(model, 'Marketing Manager', 'Marketing', 3, False):,.2f}")
