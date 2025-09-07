#[cfg(test)]
mod tests {
    use crate::models::task::{CreateTaskRequest, UpdateTaskRequest};

    #[test]
    fn test_create_task_request_validation_valid() {
        let request = CreateTaskRequest {
            title: "Valid task title".to_string(),
            description: Some("Valid description".to_string()),
        };
        
        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_create_task_request_validation_empty_title() {
        let request = CreateTaskRequest {
            title: "".to_string(),
            description: None,
        };
        
        let result = request.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }

    #[test]
    fn test_create_task_request_validation_whitespace_title() {
        let request = CreateTaskRequest {
            title: "   ".to_string(),
            description: None,
        };
        
        let result = request.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }

    #[test]
    fn test_create_task_request_validation_long_title() {
        let request = CreateTaskRequest {
            title: "a".repeat(256),
            description: None,
        };
        
        let result = request.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot exceed 255 characters"));
    }

    #[test]
    fn test_create_task_request_validation_long_description() {
        let request = CreateTaskRequest {
            title: "Valid title".to_string(),
            description: Some("a".repeat(1001)),
        };
        
        let result = request.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot exceed 1000 characters"));
    }

    #[test]
    fn test_update_task_request_validation_valid() {
        let request = UpdateTaskRequest {
            title: Some("Valid updated title".to_string()),
            description: Some("Valid updated description".to_string()),
        };
        
        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_update_task_request_validation_empty_fields() {
        let request = UpdateTaskRequest {
            title: None,
            description: None,
        };
        
        assert!(request.validate().is_ok());
    }

    #[test]
    fn test_update_task_request_validation_empty_title() {
        let request = UpdateTaskRequest {
            title: Some("".to_string()),
            description: None,
        };
        
        let result = request.validate();
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }
}