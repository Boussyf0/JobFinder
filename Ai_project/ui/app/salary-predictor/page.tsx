import React from 'react';
import SalaryPredictorForm from '@/components/SalaryPredictorForm';

export const metadata = {
  title: 'Salary Predictor | Morocco Job Search',
  description: 'Predict your salary based on job title, department, experience, and location',
};

export default function SalaryPredictorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Salary Predictor</h1>
        <p className="text-lg text-gray-600 mb-8">
          Estimate your potential salary based on job title, department, experience, and location.
          Our AI-powered prediction model uses data from thousands of Moroccan job listings.
        </p>
        
        <div className="bg-indigo-50 p-4 rounded-lg mb-8">
          <h2 className="text-lg font-medium text-indigo-800 mb-2">How it works</h2>
          <p className="text-indigo-600">
            Our machine learning model has been trained on job data from the Moroccan market.
            Enter your details below to get a personalized salary prediction for your profile.
            The more information you provide, the more accurate your prediction will be.
          </p>
        </div>
        
        <SalaryPredictorForm />
        
        <div className="mt-12 text-sm text-gray-500">
          <h3 className="font-medium text-gray-700 mb-2">About our salary predictions</h3>
          <p>
            Predictions are based on real market data from job listings across Morocco.
            The model considers multiple factors including job title, department, years of experience,
            whether the job is remote, and location. Actual salaries may vary based on additional factors
            such as company size, benefits package, and negotiation outcomes.
          </p>
        </div>
      </div>
    </div>
  );
} 