import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Skill {
  name: string;
  level: 'Grundlagen' | 'Fortgeschritten' | 'Experte';
  examples: string[];
}

interface Experience {
  title: string;
  description: string;
  examples: string[];
}

interface CareerProfile {
  profile_name: string;
  description: string;
  skills: Skill[];
  experiences: Experience[];
}

interface CareerProfileEditorProps {
  visible: boolean;
  profile?: CareerProfile | null;
  onSave: (profile: CareerProfile) => void;
  onCancel: () => void;
}

const steps = [
  'Grunddaten',
  'Fähigkeiten',
  'Erfahrungen',
  'Zusammenfassung'
] as const;

type Step = typeof steps[number];

const CareerProfileEditor: React.FC<CareerProfileEditorProps> = ({ 
  visible, 
  profile: initialProfile, 
  onSave, 
  onCancel 
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('Grunddaten');
  const [profile, setProfile] = useState<CareerProfile>({
    profile_name: '',
    description: '',
    skills: [],
    experiences: []
  });
  const [newSkill, setNewSkill] = useState<Skill>({
    name: '',
    level: 'Grundlagen',
    examples: []
  });
  const [newExperience, setNewExperience] = useState<Experience>({
    title: '',
    description: '',
    examples: []
  });

  // Initialize profile when editor opens
  useEffect(() => {
    if (visible) {
      if (initialProfile) {
        setProfile(initialProfile);
      } else {
        // Reset for new profile
        setProfile({
          profile_name: '',
          description: '',
          skills: [],
          experiences: []
        });
      }
      setCurrentStep('Grunddaten');
    }
  }, [visible, initialProfile]);

  const handleBasicDataChange = (field: keyof Pick<CareerProfile, 'profile_name' | 'description'>, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const addSkill = () => {
    if (newSkill.name.trim()) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, { ...newSkill }]
      }));
      setNewSkill({
        name: '',
        level: 'Grundlagen',
        examples: []
      });
    }
  };

  const removeSkill = (index: number) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const editSkill = (index: number) => {
    const skillToEdit = profile.skills[index];
    setNewSkill({ ...skillToEdit });
    // Remove the skill being edited so it can be re-added with changes
    removeSkill(index);
  };

  const addExperience = () => {
    if (newExperience.title.trim()) {
      setProfile(prev => ({
        ...prev,
        experiences: [...prev.experiences, { ...newExperience }]
      }));
      setNewExperience({
        title: '',
        description: '',
        examples: []
      });
    }
  };

  const removeExperience = (index: number) => {
    setProfile(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const editExperience = (index: number) => {
    const experienceToEdit = profile.experiences[index];
    setNewExperience({ ...experienceToEdit });
    // Remove the experience being edited so it can be re-added with changes
    removeExperience(index);
  };

  const handleSkillExampleChange = (examples: string) => {
    setNewSkill(prev => ({
      ...prev,
      examples: examples.split(',').map(ex => ex.trim()).filter(ex => ex.length > 0)
    }));
  };

  const handleExperienceExampleChange = (examples: string) => {
    setNewExperience(prev => ({
      ...prev,
      examples: examples.split(',').map(ex => ex.trim()).filter(ex => ex.length > 0)
    }));
  };

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSave = () => {
    onSave(profile);
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 'Grunddaten':
        return profile.profile_name.trim() !== '' && profile.description.trim() !== '';
      case 'Fähigkeiten':
        return profile.skills.length > 0;
      case 'Erfahrungen':
        return profile.experiences.length > 0;
      case 'Zusammenfassung':
        return true;
      default:
        return false;
    }
  };

  const isLastStep = currentStep === 'Zusammenfassung';
  const isFirstStep = currentStep === 'Grunddaten';

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">
            {initialProfile ? 'Career-Profil bearbeiten' : 'Neues Career-Profil erstellen'}
          </h2>
          <p className="text-green-100 mt-1">
            Schritt {steps.indexOf(currentStep) + 1} von {steps.length}: {currentStep}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center">
            {steps.map((step, index) => {
              const isActive = step === currentStep;
              const isCompleted = steps.indexOf(step) < steps.indexOf(currentStep);
              
              return (
                <React.Fragment key={step}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-2 mx-2 rounded ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 'Grunddaten' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profil-Name *
                    </label>
                    <input
                      type="text"
                      value={profile.profile_name}
                      onChange={(e) => handleBasicDataChange('profile_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Frontend Developer, Data Scientist, Marketing Manager"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beschreibung *
                    </label>
                    <textarea
                      value={profile.description}
                      onChange={(e) => handleBasicDataChange('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Kurze Beschreibung des Profils, z.B. 'Erfahrener Frontend-Entwickler mit React-Fokus'"
                    />
                  </div>


                </div>
              )}

              {currentStep === 'Fähigkeiten' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Fähigkeiten hinzufügen</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fähigkeit
                          </label>
                          <input
                            type="text"
                            value={newSkill.name}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="z.B. React, Python, Projektmanagement"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Level
                          </label>
                          <select
                            value={newSkill.level}
                            onChange={(e) => setNewSkill(prev => ({ ...prev, level: e.target.value as Skill['level'] }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Grundlagen">Grundlagen</option>
                            <option value="Fortgeschritten">Fortgeschritten</option>
                            <option value="Experte">Experte</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Beispiele (optional)
                        </label>
                        <input
                          type="text"
                          onChange={(e) => handleSkillExampleChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="3 Jahre Erfahrung, 10+ Projekte, Team von 5 Entwicklern geleitet (durch Kommas getrennt)"
                        />
                      </div>

                      <button
                        onClick={addSkill}
                        className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Fähigkeit hinzufügen
                      </button>
                    </div>
                  </div>

                  {/* Skills List */}
                  {profile.skills.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Hinzugefügte Fähigkeiten</h4>
                      <div className="space-y-3">
                        {profile.skills.map((skill, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h5 className="font-medium text-gray-900">{skill.name}</h5>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    skill.level === 'Experte' ? 'bg-green-100 text-green-800' :
                                    skill.level === 'Fortgeschritten' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {skill.level}
                                  </span>
                                </div>
                                {skill.examples.length > 0 && (
                                  <p className="text-sm text-gray-600">
                                    {skill.examples.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => editSkill(index)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Fähigkeit bearbeiten"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => removeSkill(index)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Fähigkeit entfernen"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'Erfahrungen' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Berufserfahrung hinzufügen</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position/Titel
                        </label>
                        <input
                          type="text"
                          value={newExperience.title}
                          onChange={(e) => setNewExperience(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="z.B. Senior Frontend Developer, Marketing Manager"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Beschreibung
                        </label>
                        <textarea
                          value={newExperience.description}
                          onChange={(e) => setNewExperience(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Kurze Beschreibung der Tätigkeit"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Konkrete Beispiele
                        </label>
                        <input
                          type="text"
                          onChange={(e) => handleExperienceExampleChange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Team von 8 Entwicklern geleitet, 15+ Features umgesetzt, Performance um 40% verbessert (durch Kommas getrennt)"
                        />
                      </div>

                      <button
                        onClick={addExperience}
                        className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Erfahrung hinzufügen
                      </button>
                    </div>
                  </div>

                  {/* Experiences List */}
                  {profile.experiences.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Hinzugefügte Erfahrungen</h4>
                      <div className="space-y-3">
                        {profile.experiences.map((experience, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900 mb-1">{experience.title}</h5>
                                <p className="text-sm text-gray-600 mb-2">{experience.description}</p>
                                {experience.examples.length > 0 && (
                                  <p className="text-sm text-gray-500">
                                    <strong>Beispiele:</strong> {experience.examples.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => editExperience(index)}
                                  className="text-blue-500 hover:text-blue-700 p-1"
                                  title="Erfahrung bearbeiten"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => removeExperience(index)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Erfahrung entfernen"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'Zusammenfassung' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profil-Zusammenfassung</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900">Profil-Name</h4>
                      <p className="text-gray-600">{profile.profile_name}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Beschreibung</h4>
                      <p className="text-gray-600">{profile.description}</p>
                    </div>



                    <div>
                      <h4 className="font-medium text-gray-900">Fähigkeiten ({profile.skills.length})</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.skills.map((skill, index) => (
                          <span
                            key={index}
                            className={`px-3 py-1 text-sm rounded-full ${
                              skill.level === 'Experte' ? 'bg-green-100 text-green-800' :
                              skill.level === 'Fortgeschritten' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {skill.name} ({skill.level})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Erfahrungen ({profile.experiences.length})</h4>
                      <div className="space-y-2 mt-2">
                        {profile.experiences.map((experience, index) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <p className="font-medium text-sm">{experience.title}</p>
                            <p className="text-sm text-gray-600">{experience.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-lg">
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Abbrechen
            </button>
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Zurück
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {!isLastStep ? (
              <button
                onClick={nextStep}
                disabled={!validateCurrentStep()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Weiter
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Profil speichern
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CareerProfileEditor;