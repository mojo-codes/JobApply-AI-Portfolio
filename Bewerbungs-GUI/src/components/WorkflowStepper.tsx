import React from 'react';
import { motion } from 'framer-motion';

export type WorkflowStep = 
  | 'configuration' 
  | 'job_selection' 
  | 'application_preview' 
  | 'completed_applications';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

interface StepInfo {
  key: WorkflowStep;
  label: string;
  icon: string;
  description: string;
}

const steps: StepInfo[] = [
  {
    key: 'configuration',
    label: 'Konfiguration',
    icon: '⚙️',
    description: 'Suchparameter & Profile'
  },
  {
    key: 'job_selection',
    label: 'Job-Auswahl',
    icon: '🎯',
    description: 'Jobs bewerten & auswählen'
  },
  {
    key: 'application_preview',
    label: 'Bewerbungs-Review',
    icon: '📝',
    description: 'Bewerbungen prüfen & genehmigen'
  },
  {
    key: 'completed_applications',
    label: 'Abgeschlossen',
    icon: '✅',
    description: 'Finalisierte Bewerbungen'
  }
];

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepClick,
  className = '',
  size = 'medium',
  showLabels = true
}) => {
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'py-2',
          step: 'w-8 h-8 text-sm',
          icon: 'text-base',
          label: 'text-xs',
          description: 'text-xs'
        };
      case 'large':
        return {
          container: 'py-6',
          step: 'w-16 h-16 text-lg',
          icon: 'text-2xl',
          label: 'text-base',
          description: 'text-sm'
        };
      default: // medium
        return {
          container: 'py-4',
          step: 'w-12 h-12 text-base',
          icon: 'text-xl',
          label: 'text-sm',
          description: 'text-xs'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const getStepStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          background: 'bg-gradient-to-r from-green-500 to-emerald-600',
          border: 'border-green-400',
          text: 'text-white',
          shadow: 'shadow-lg shadow-green-500/20'
        };
      case 'current':
        return {
          background: 'bg-gradient-to-r from-blue-500 to-purple-600',
          border: 'border-blue-400',
          text: 'text-white',
          shadow: 'shadow-lg shadow-blue-500/30'
        };
      default: // upcoming
        return {
          background: 'bg-white/10',
          border: 'border-white/30',
          text: 'text-white/70',
          shadow: 'shadow-md'
        };
    }
  };

  const getConnectorStyles = (stepIndex: number) => {
    const isCompleted = stepIndex < currentStepIndex;
    return isCompleted 
      ? 'bg-gradient-to-r from-green-500 to-blue-500' 
      : 'bg-white/20';
  };

  return (
    <div className={`w-full ${sizeClasses.container} ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const styles = getStepStyles(status);
          const isClickable = onStepClick && (status === 'completed' || status === 'current');

          return (
            <React.Fragment key={step.key}>
              {/* Step Circle */}
              <div className="flex flex-col items-center space-y-2">
                <motion.div
                  whileHover={isClickable ? { scale: 1.05 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                  onClick={() => isClickable && onStepClick && onStepClick(step.key)}
                  className={`
                    ${sizeClasses.step}
                    ${styles.background}
                    ${styles.border}
                    ${styles.text}
                    ${styles.shadow}
                    border-2 rounded-full flex items-center justify-center
                    transition-all duration-300 backdrop-blur-md
                    ${isClickable ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'}
                    relative overflow-hidden
                  `}
                >
                  {/* Background animation for current step */}
                  {status === 'current' && (
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-white/20 rounded-full"
                    />
                  )}
                  
                  <span className={`${sizeClasses.icon} relative z-10`}>
                    {status === 'completed' ? '✓' : step.icon}
                  </span>
                </motion.div>

                {/* Step Label & Description */}
                {showLabels && (
                  <div className="text-center min-w-0 max-w-[100px]">
                    <div className={`font-medium ${sizeClasses.label} ${styles.text} truncate`}>
                      {step.label}
                    </div>
                    <div className={`${sizeClasses.description} text-white/50 truncate`}>
                      {step.description}
                    </div>
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 relative">
                  <div className="w-full h-full bg-white/20 rounded-full" />
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: index < currentStepIndex ? '100%' : '0%' 
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className={`absolute top-0 left-0 h-full rounded-full ${getConnectorStyles(index)}`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current Step Summary */}
      {size !== 'small' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20">
            <span className="text-lg">
              {steps[currentStepIndex]?.icon}
            </span>
            <span className="text-white/90 font-medium">
              Schritt {currentStepIndex + 1} von {steps.length}: {steps[currentStepIndex]?.label}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default WorkflowStepper; 