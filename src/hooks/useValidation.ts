import { useState, useCallback, useRef, useEffect } from 'react';
import { ValidationUtils, ValidationResult, ValidationErrors } from '@/utils/validationUtils';
import { ErrorHandler } from '@/utils/errorHandling';

export interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export interface ValidationState {
  errors: ValidationErrors;
  isValid: boolean;
  isValidating: boolean;
  hasValidated: boolean;
}

export interface ValidationActions {
  validateField: (field: string, value: any, context?: any) => Promise<string | null>;
  validateForm: (data: any) => Promise<ValidationResult>;
  clearErrors: (fields?: string[]) => void;
  setFieldError: (field: string, error: string | null) => void;
  reset: () => void;
}

export function useValidation(
  validationFn: (data: any) => ValidationResult,
  options: UseValidationOptions = {}
): [ValidationState, ValidationActions] {
  const {
    // validateOnChange = false,
    // validateOnBlur = true,
    debounceMs = 300
  } = options;

  const [state, setState] = useState<ValidationState>({
    errors: {},
    isValid: true,
    isValidating: false,
    hasValidated: false
  });

  const debounceTimeouts = useRef<Map<string, NodeJS.Timeout | null>>(new Map());

  const validateField = useCallback(async (
    field: string,
    value: any,
    context?: any
  ): Promise<string | null> => {
    // Clear existing timeout for this field
    const existingTimeout = debounceTimeouts.current.get(field);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        try {
          setState(prev => ({ ...prev, isValidating: true }));

          const error = ValidationUtils.validateField(field, value, context);
          
          setState(prev => {
            const newErrors = { ...prev.errors };
            if (error) {
              newErrors[field] = error;
            } else {
              delete newErrors[field];
            }
            
            return {
              ...prev,
              errors: newErrors,
              isValidating: false,
              hasValidated: true,
              isValid: Object.keys(newErrors).length === 0
            };
          });

          resolve(error);
        } catch (validationError) {
          const appError = ErrorHandler.normalizeError(validationError, {
            operation: 'field_validation',
            additionalData: { field, value }
          });

          setState(prev => ({
            ...prev,
            errors: {
              ...prev.errors,
              [field]: ErrorHandler.getUserFriendlyMessage(appError)
            },
            isValidating: false,
            hasValidated: true
          }));

          resolve(ErrorHandler.getUserFriendlyMessage(appError));
        }

        debounceTimeouts.current.delete(field);
      }, debounceMs);

      debounceTimeouts.current.set(field, timeout);
    });
  }, [debounceMs]);

  const validateForm = useCallback(async (data: any): Promise<ValidationResult> => {
    try {
      setState(prev => ({ ...prev, isValidating: true }));

      const result = validationFn(data);
      
      setState(prev => ({
        ...prev,
        errors: result.errors,
        isValid: result.isValid,
        isValidating: false,
        hasValidated: true
      }));

      return result;
    } catch (validationError) {
      const appError = ErrorHandler.normalizeError(validationError, {
        operation: 'form_validation',
        additionalData: { data }
      });

      const errorMessage = ErrorHandler.getUserFriendlyMessage(appError);
      
      setState(prev => ({
        ...prev,
        errors: { general: errorMessage },
        isValid: false,
        isValidating: false,
        hasValidated: true
      }));

      return {
        isValid: false,
        errors: { general: errorMessage }
      };
    }
  }, [validationFn]);

  const clearErrors = useCallback((fields?: string[]) => {
    setState(prev => {
      if (!fields) {
        return {
          ...prev,
          errors: {},
          isValid: true
        };
      }

      const newErrors = { ...prev.errors };
      fields.forEach(field => {
        delete newErrors[field];
      });

      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, []);

  const setFieldError = useCallback((field: string, error: string | null) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, []);

  const reset = useCallback(() => {
    // Clear all debounce timeouts
    debounceTimeouts.current.forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
    debounceTimeouts.current.clear();

    setState({
      errors: {},
      isValid: true,
      isValidating: false,
      hasValidated: false
    });
  }, []);

  return [
    state,
    {
      validateField,
      validateForm,
      clearErrors,
      setFieldError,
      reset
    }
  ];
}

// Specialized hook for task validation
export function useTaskValidation(options?: UseValidationOptions) {
  return useValidation(ValidationUtils.validateCreateTaskInput, options);
}

// Hook for real-time field validation
export function useFieldValidation(
  field: string,
  value: any,
  context?: any,
  options: UseValidationOptions = {}
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const validate = useCallback(async () => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      setIsValidating(true);
      try {
        const validationError = ValidationUtils.validateField(field, value, context);
        setError(validationError);
      } catch (validationError) {
        const appError = ErrorHandler.normalizeError(validationError);
        setError(ErrorHandler.getUserFriendlyMessage(appError));
      } finally {
        setIsValidating(false);
      }
    }, options.debounceMs || 300);
  }, [field, value, context, options.debounceMs]);

  // Validate on value change if enabled
  useEffect(() => {
    if (options.validateOnChange && value !== undefined && value !== null) {
      validate();
    }
  }, [value, validate, options.validateOnChange]);

  return {
    error,
    isValidating,
    validate,
    clearError: () => setError(null)
  };
}