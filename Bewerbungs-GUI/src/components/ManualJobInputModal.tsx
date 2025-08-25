import React, { useState } from 'react';

interface ManualJobInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}

const ManualJobInputModal: React.FC<ManualJobInputModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [jobUrl, setJobUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (jobUrl.trim()) {
      onSubmit(jobUrl);
      setJobUrl('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Manuelle Job-URL eingeben</h2>
        <input
          type="text"
          value={jobUrl}
          onChange={(e) => setJobUrl(e.target.value)}
          placeholder="Geben Sie die Job-URL hier ein..."
          className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mb-4"
        />
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
          >
            Job verarbeiten
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualJobInputModal;
