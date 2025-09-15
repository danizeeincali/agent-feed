# Security Testing Suite for Dynamic Pages

A comprehensive security testing framework designed to identify and prevent vulnerabilities in dynamic web applications. This suite implements industry-standard security testing practices and integrates with automated scanning tools.

## 🛡️ Test Coverage

### XSS Protection (`xss-protection.spec.ts`)
- **Dynamic Content Rendering**: Tests for malicious script injection in dynamic content
- **Context-Specific XSS**: Validates protection across different HTML contexts
- **Advanced XSS Attacks**: Including mutation XSS, DOM clobbering, and prototype pollution
- **URL/Form Encoding**: Tests for various encoding bypass attempts

### CSRF Protection (`csrf-validation.js`)
- **Token Generation**: Cryptographically secure CSRF token creation
- **Double Submit Cookie**: Implementation and validation
- **SameSite Cookies**: Cross-origin request protection
- **Origin/Referer Validation**: Request origin verification
- **Rate Limiting**: Protection against CSRF brute force attacks

### Input Sanitization (`input-sanitization.spec.ts`)
- **SQL Injection**: Prevention of database manipulation attacks
- **NoSQL Injection**: MongoDB and other NoSQL database protection
- **Command Injection**: System command execution prevention
- **Path Traversal**: File system access restriction
- **File Upload Security**: Malicious file upload prevention

### Authentication & Authorization (`auth-testing.spec.ts`)
- **Password Security**: Strong password policies and secure hashing
- **JWT Token Security**: Token generation, validation, and blacklisting
- **Session Management**: Secure session creation and validation
- **Multi-Factor Authentication**: TOTP implementation and validation
- **Account Lockout**: Progressive lockout and brute force protection
- **Role-Based Access Control**: Authorization testing

### API Security Scanning (`api-security-scan.js`)
- **Authentication Tests**: Protected endpoint validation
- **Authorization Tests**: Role-based and resource-based access control
- **Input Validation**: API parameter and payload sanitization
- **Information Disclosure**: Sensitive data exposure prevention
- **Business Logic**: Race conditions and logic flaw testing
- **OWASP Integration**: Automated vulnerability scanning

### Content Security Policy (`csp-validation.js`)
- **Policy Validation**: CSP header configuration testing
- **Script Source Control**: Inline script and eval() prevention
- **Resource Loading**: Control of external resource loading
- **Violation Reporting**: CSP violation detection and reporting
- **Best Practices**: Security configuration recommendations

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install browser dependencies for CSP testing
npx playwright install
```

### Running Tests

```bash
# Run all security tests
npm run test:security

# Run individual test suites
npm run test:xss        # XSS protection tests
npm run test:csrf       # CSRF validation tests
npm run test:input      # Input sanitization tests
npm run test:auth       # Authentication tests
npm run test:api        # API security scanning
npm run test:csp        # CSP validation tests
```

### Security Scanning

```bash
# Run OWASP ZAP baseline scan
npm run scan:owasp

# Run dependency audit
npm run scan:audit

# Run SSL/TLS configuration check
npm run scan:ssl

# Run comprehensive security scan
npm run scan:full

# Generate security report
npm run report:generate
```

### CI/CD Integration

```bash
# Complete security pipeline
npm run ci:security
```

## 📊 Security Scanner

The included security scanner provides comprehensive vulnerability assessment:

### Features

- **OWASP Top 10 Testing**: Automated testing for common vulnerabilities
- **SSL/TLS Analysis**: Certificate and configuration validation
- **Security Headers**: HTTP security header verification
- **Dependency Scanning**: Known vulnerability detection
- **Business Logic Testing**: Application-specific security flaws
- **Compliance Reporting**: OWASP, PCI-DSS, GDPR compliance assessment

### Usage

```bash
# Run comprehensive scan
node security-scanner.js full

# Specific scans
node security-scanner.js ssl
node security-scanner.js owasp
node security-scanner.js headers
```

## 📈 Report Generation

The security report generator creates comprehensive documentation:

### Generated Reports

1. **Executive Summary**: High-level security overview
2. **Detailed Report**: Complete findings and technical details
3. **Compliance Report**: Regulatory compliance assessment
4. **Trend Analysis**: Security posture over time
5. **Action Plan**: Prioritized remediation steps
6. **Security Metrics**: Quantitative security measurements

### Report Generation

```bash
# Generate consolidated report
node generate-security-report.js
```

## 🔧 Configuration

### Environment Variables

```bash
# API base URL for testing
API_BASE_URL=http://localhost:3000

# Security scan target
SCAN_TARGET=https://yourdomain.com

# Report output directory
SECURITY_REPORT_DIR=./security-reports
```

### Test Configuration

Create a `security.config.js` file:

```javascript
module.exports = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
  browsers: ['chromium', 'firefox', 'webkit'],
  scanning: {
    owaspZap: {
      enabled: true,
      target: process.env.SCAN_TARGET,
      reportFormat: 'JSON'
    },
    sslLabs: {
      enabled: true,
      grade: 'A'
    }
  }
};
```

## 🎯 Test Scenarios

### Malicious Payloads

The test suite includes comprehensive payloads for:

- **XSS Vectors**: 25+ different XSS attack patterns
- **SQL Injection**: 15+ SQL injection variations
- **Command Injection**: System command execution attempts
- **Path Traversal**: Directory traversal patterns
- **File Upload**: Malicious file type testing

### Attack Simulation

Tests simulate real-world attack scenarios:

- **Session Hijacking**: User session takeover attempts
- **CSRF Attacks**: Cross-site request forgery
- **Brute Force**: Authentication bypass attempts
- **Privilege Escalation**: Unauthorized access attempts
- **Data Extraction**: Information disclosure testing

## 🛠️ Integration

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
name: Security Testing
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run ci:security
      - uses: actions/upload-artifact@v2
        with:
          name: security-reports
          path: security-reports/
```

### Pre-commit Hooks

```bash
# Install pre-commit security checks
npm install --save-dev husky lint-staged

# Add to package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run test:security"
    }
  }
}
```

## 📚 Best Practices

### Security Test Development

1. **Test-Driven Security**: Write security tests before implementation
2. **Comprehensive Coverage**: Test all input vectors and attack surfaces
3. **Regular Updates**: Keep attack patterns and payloads current
4. **False Positive Management**: Minimize and document false positives
5. **Performance Impact**: Monitor test execution time and resource usage

### Vulnerability Management

1. **Risk Assessment**: Prioritize vulnerabilities by severity and exploitability
2. **Remediation Tracking**: Document fixes and verification testing
3. **Regression Testing**: Ensure fixes don't introduce new vulnerabilities
4. **Security Metrics**: Track security improvement over time

## 🔍 Troubleshooting

### Common Issues

#### CSP Tests Failing
```bash
# Ensure CSP headers are properly set
curl -I http://localhost:3000 | grep -i content-security-policy
```

#### Authentication Tests Timing Out
```bash
# Check if authentication endpoints are running
curl -X POST http://localhost:3000/api/auth/login
```

#### Scanner Connection Issues
```bash
# Verify target application is accessible
curl -I http://localhost:3000/health
```

### Debug Mode

Enable verbose logging:

```bash
DEBUG=security:* npm run test:security
```

## 📋 Compliance Standards

This testing suite helps ensure compliance with:

- **OWASP Top 10**: Web application security risks
- **PCI DSS**: Payment card industry security
- **GDPR**: Data protection regulations
- **SOX**: Financial reporting controls
- **NIST Cybersecurity Framework**: Risk management

## 🤝 Contributing

### Adding New Tests

1. Create test files in appropriate categories
2. Follow existing naming conventions
3. Include comprehensive payload sets
4. Document test scenarios
5. Update CI/CD pipeline configuration

### Security Research

1. Research new attack vectors
2. Develop detection methods
3. Create test implementations
4. Validate against real vulnerabilities
5. Share findings with security community

## 📄 License

MIT License - see LICENSE file for details.

## 🚨 Security Disclaimer

This testing suite is designed for authorized security testing only. Do not use these tools against systems you do not own or have explicit permission to test. Users are responsible for ensuring compliance with applicable laws and regulations.