'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  location: string;
  bio: string;
  skills: string[];
  preferences: {
    emailNotifications: boolean;
    jobAlerts: boolean;
    darkMode: boolean;
    language: string;
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    name: "John Doe",
    email: "john.doe@example.com",
    role: "Software Engineer",
    location: "Casablanca, Morocco",
    bio: "Experienced software engineer with a passion for building scalable applications.",
    skills: ["JavaScript", "React", "Node.js", "Python", "SQL"],
    preferences: {
      emailNotifications: true,
      jobAlerts: true,
      darkMode: false,
      language: "English"
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  const handleInputChange = (field: string, value: string) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (preference: string, value: boolean) => {
    setEditedProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
    // Here you would typically make an API call to save the changes
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              <Button
                variant="outline"
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={isEditing ? editedProfile.name : profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={isEditing ? editedProfile.email : profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Current Role</Label>
                  <Input
                    id="role"
                    value={isEditing ? editedProfile.role : profile.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={isEditing ? editedProfile.location : profile.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  value={isEditing ? editedProfile.bio : profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="newSkill">Add New Skill</Label>
                    <div className="flex gap-2">
                      <Input
                        id="newSkill"
                        placeholder="Enter a skill"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            if (input.value.trim()) {
                              setEditedProfile(prev => ({
                                ...prev,
                                skills: [...prev.skills, input.value.trim()]
                              }));
                              input.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive email notifications about your account
                    </p>
                  </div>
                  <Switch
                    checked={isEditing ? editedProfile.preferences.emailNotifications : profile.preferences.emailNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Job Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Get notified about new job opportunities
                    </p>
                  </div>
                  <Switch
                    checked={isEditing ? editedProfile.preferences.jobAlerts : profile.preferences.jobAlerts}
                    onCheckedChange={(checked) => handlePreferenceChange('jobAlerts', checked)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-gray-500">
                      Switch between light and dark theme
                    </p>
                  </div>
                  <Switch
                    checked={isEditing ? editedProfile.preferences.darkMode : profile.preferences.darkMode}
                    onCheckedChange={(checked) => handlePreferenceChange('darkMode', checked)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    className="w-full p-2 border rounded-md"
                    value={isEditing ? editedProfile.preferences.language : profile.preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="English">English</option>
                    <option value="French">French</option>
                    <option value="Arabic">Arabic</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 