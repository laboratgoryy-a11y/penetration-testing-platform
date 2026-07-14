import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../utils/errors';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class InputValidator {
  /**
   * Validate URL
   */
  static validateUrl(url: string): ValidationResult {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          errors: ['Only HTTP and HTTPS protocols are allowed'],
        };
      }

      return { valid: true };
    } catch (_error) {
      return {
        valid: false,
        errors: ['Invalid URL format'],
      };
    }
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        errors: ['Invalid email format'],
      };
    }

    return { valid: true };
  }

  /**
   * Validate IP address (IPv4)
   */
  static validateIpAddress(ip: string): ValidationResult {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (!ipv4Regex.test(ip)) {
      return {
        valid: false,
        errors: ['Invalid IPv4 address format'],
      };
    }

    // Check each octet is 0-255
    const octets = ip.split('.').map(Number);
    if (octets.some(octet => octet < 0 || octet > 255)) {
      return {
        valid: false,
        errors: ['IP address octets must be between 0 and 255'],
      };
    }

    return { valid: true };
  }

  /**
   * Validate MAC address
   */
  static validateMacAddress(mac: string): ValidationResult {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    
    if (!macRegex.test(mac)) {
      return {
        valid: false,
        errors: ['Invalid MAC address format'],
      };
    }

    return { valid: true };
  }

  /**
   * Validate UUID
   */
  static validateUuid(uuid: string): ValidationResult {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(uuid)) {
      return {
        valid: false,
        errors: ['Invalid UUID format'],
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize HTML (basic implementation)
   */
  static sanitizeHtml(html: string): string {
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate required fields in request body
   */
  static validateRequired(fields: string[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
      const missing: string[] = [];

      for (const field of fields) {
        if (req.body[field] === undefined || req.body[field] === null) {
          missing.push(field);
        }
      }

      if (missing.length > 0) {
        throw new ValidationError(
          `Missing required fields: ${missing.join(', ')}`,
          missing[0],
          undefined
        );
      }

      next();
    };
  }

  /**
   * Validate request body against schema
   */
  static validateBody(schema: Record<string, (value: any) => ValidationResult>) {
    return (req: Request, _res: Response, next: NextFunction) => {
      const errors: Record<string, string[]> = {};

      for (const [field, validator] of Object.entries(schema)) {
        if (req.body[field] !== undefined) {
          const result = validator(req.body[field]);
          if (!result.valid && result.errors) {
            errors[field] = result.errors;
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError(
          'Validation failed',
          Object.keys(errors)[0],
          errors
        );
      }

      next();
    };
  }
}
