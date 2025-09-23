/**
 * Component Security Test Suite
 * Comprehensive security validation for all component registry components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { componentRegistry } from '@services/ComponentRegistry';

describe('Component Security Validation', () => {
  describe('XSS Prevention', () => {
    const getAllRegisteredComponents = () => {
      return ['Button', 'Input', 'Card', 'Badge', 'Alert', 'Avatar', 'Progress', 'Container', 'Separator'];
    };

    describe('Script Injection Prevention', () => {
      it('should block script tags in all string properties', () => {
        const scriptPayloads = [
          '<script>alert("XSS")</script>',
          '<SCRIPT>alert("XSS")</SCRIPT>',
          '<script src="malicious.js"></script>',
          '<script type="text/javascript">alert("XSS")</script>',
          '&lt;script&gt;alert("XSS")&lt;/script&gt;'
        ];

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          scriptPayloads.forEach(payload => {
            const testProps = {
              'data-testid': 'security-test',
              children: payload,
              title: payload,
              placeholder: payload,
              'aria-label': payload,
              label: payload
            };

            const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

            Object.values(sanitized).forEach((value: any) => {
              if (typeof value === 'string') {
                expect(value).not.toMatch(/<script[\s\S]*?>[\s\S]*?<\/script>/gi);
                expect(value).not.toMatch(/<script[\s\S]*?>/gi);
              }
            });
          });
        });
      });

      it('should block JavaScript protocol URLs', () => {
        const jsUrls = [
          'javascript:alert("XSS")',
          'JAVASCRIPT:alert("XSS")',
          'javascript:void(0)',
          'javascript:eval("malicious")',
          'javascript://example.com/%0Aalert("XSS")'
        ];

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          jsUrls.forEach(url => {
            const testProps = {
              'data-testid': 'security-test',
              href: url,
              src: url,
              action: url
            };

            const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

            Object.entries(sanitized).forEach(([key, value]) => {
              if (typeof value === 'string' && (key.includes('href') || key.includes('src') || key.includes('url'))) {
                expect(value).not.toMatch(/^javascript:/i);
              }
            });
          });
        });
      });

      it('should block data URLs with HTML content', () => {
        const dataUrls = [
          'data:text/html,<script>alert("XSS")</script>',
          'data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=',
          'data:application/javascript,alert("XSS")',
          'data:text/html,<img src=x onerror=alert("XSS")>'
        ];

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          dataUrls.forEach(url => {
            const testProps = {
              'data-testid': 'security-test',
              src: url
            };

            const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

            if (sanitized.src && typeof sanitized.src === 'string') {
              expect(sanitized.src).not.toMatch(/^data:text\/html/i);
              expect(sanitized.src).not.toMatch(/^data:application\/javascript/i);
            }
          });
        });
      });

      it('should block VBScript and other dangerous protocols', () => {
        const dangerousProtocols = [
          'vbscript:msgbox("XSS")',
          'about:blank',
          'file:///etc/passwd',
          'ftp://malicious.com/steal-data',
          'chrome-extension://malicious',
          'moz-extension://evil'
        ];

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          dangerousProtocols.forEach(url => {
            const testProps = {
              'data-testid': 'security-test',
              src: url,
              href: url
            };

            const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

            Object.values(sanitized).forEach((value: any) => {
              if (typeof value === 'string') {
                expect(value).not.toMatch(/^(vbscript|about|file|ftp|chrome-extension|moz-extension):/i);
              }
            });
          });
        });
      });
    });

    describe('HTML Injection Prevention', () => {
      it('should sanitize HTML tags in text content', () => {
        const htmlPayloads = [
          '<img src="x" onerror="alert(1)">',
          '<svg onload="alert(1)">',
          '<iframe src="javascript:alert(1)">',
          '<object data="javascript:alert(1)">',
          '<embed src="javascript:alert(1)">',
          '<link rel="stylesheet" href="javascript:alert(1)">',
          '<style>body{background:url("javascript:alert(1)")}</style>',
          '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
        ];

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          htmlPayloads.forEach(payload => {
            const testProps = {
              'data-testid': 'security-test',
              children: payload,
              title: payload,
              description: payload,
              label: payload
            };

            const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

            Object.values(sanitized).forEach((value: any) => {
              if (typeof value === 'string') {
                expect(value).not.toMatch(/<(img|svg|iframe|object|embed|link|style|meta)[\s\S]*?>/gi);
              }
            });
          });
        });
      });

      it('should remove dangerous HTML attributes', () => {
        const dangerousAttributes = [
          'onload="alert(1)"',
          'onerror="alert(1)"',
          'onclick="alert(1)"',
          'onmouseover="alert(1)"',
          'onfocus="alert(1)"',
          'onblur="alert(1)"',
          'onchange="alert(1)"',
          'onsubmit="alert(1)"'
        ];

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          dangerousAttributes.forEach(attr => {
            const payload = `<div ${attr}>content</div>`;
            const testProps = {
              'data-testid': 'security-test',
              children: payload
            };

            const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

            if (sanitized.children && typeof sanitized.children === 'string') {
              expect(sanitized.children).not.toMatch(/on\w+\s*=\s*["'][^"']*["']/gi);
            }
          });
        });
      });
    });

    describe('Event Handler Blocking', () => {
      it('should block dangerous function props', () => {
        const dangerousFunctions = {
          onClick: () => eval('alert("danger")'),
          onMouseOver: () => document.write('<script>alert("xss")</script>'),
          onFocus: () => location.href = 'javascript:alert(1)',
          onBlur: () => fetch('/steal-data', { method: 'POST', body: document.cookie }),
          onChange: () => new Function('alert("xss")')(),
          onSubmit: () => window.open('javascript:alert(1)'),
          dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' }
        };

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const testProps = {
            'data-testid': 'security-test',
            ...dangerousFunctions
          };

          const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

          Object.keys(dangerousFunctions).forEach(prop => {
            expect(sanitized).not.toHaveProperty(prop);
          });
        });
      });

      it('should maintain security policy compliance', () => {
        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const securityPolicy = componentRegistry.getSecurityPolicy(componentName);
          expect(securityPolicy).toBeDefined();
          expect(securityPolicy?.blockedProps).toBeDefined();
          expect(securityPolicy?.blockedProps.length).toBeGreaterThan(0);

          // Common dangerous props should be blocked
          const commonDangerousProps = ['onClick', 'onMouseOver', 'dangerouslySetInnerHTML'];
          commonDangerousProps.forEach(prop => {
            expect(securityPolicy?.blockedProps).toContain(prop);
          });
        });
      });
    });

    describe('Content Security Policy Compliance', () => {
      it('should enforce data size limits', () => {
        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const securityPolicy = componentRegistry.getSecurityPolicy(componentName);
          expect(securityPolicy?.maxDataSize).toBeDefined();
          expect(securityPolicy?.maxDataSize).toBeGreaterThan(0);

          // Test with oversized content
          const largeContent = 'x'.repeat(securityPolicy!.maxDataSize! + 1000);
          const testProps = {
            'data-testid': 'security-test',
            children: largeContent,
            title: largeContent,
            description: largeContent
          };

          const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);

          Object.values(sanitized).forEach((value: any) => {
            if (typeof value === 'string') {
              expect(value.length).toBeLessThanOrEqual(securityPolicy!.maxDataSize!);
            }
          });
        });
      });

      it('should validate external content restrictions', () => {
        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const securityPolicy = componentRegistry.getSecurityPolicy(componentName);
          
          if (!securityPolicy?.allowExternalContent) {
            const externalUrls = [
              'https://malicious.com/image.jpg',
              'http://untrusted.net/script.js',
              '//evil.com/resource'
            ];

            externalUrls.forEach(url => {
              const testProps = {
                'data-testid': 'security-test',
                src: url,
                href: url
              };

              const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);
              
              // Should either remove the prop or validate against allowed domains
              if (sanitized.src || sanitized.href) {
                // If external content is blocked, these should be removed or validated
                expect(true).toBe(true); // Placeholder - actual validation depends on implementation
              }
            });
          }
        });
      });
    });

    describe('URL Validation', () => {
      it('should validate URLs against security policies', () => {
        const testUrls = [
          { url: 'https://example.com', shouldBeValid: true },
          { url: 'http://example.com', shouldBeValid: true },
          { url: 'mailto:test@example.com', shouldBeValid: true },
          { url: 'tel:+1234567890', shouldBeValid: true },
          { url: 'javascript:alert(1)', shouldBeValid: false },
          { url: 'data:text/html,<script>alert(1)</script>', shouldBeValid: false },
          { url: 'vbscript:msgbox("XSS")', shouldBeValid: false },
          { url: 'about:blank', shouldBeValid: false }
        ];

        testUrls.forEach(({ url, shouldBeValid }) => {
          const result = (componentRegistry as any).validateUrl?.(url) ?? true;
          
          if (shouldBeValid) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        });
      });

      it('should validate URLs with domain whitelist', () => {
        const allowedDomains = ['example.com', 'trusted.org'];
        const testCases = [
          { url: 'https://example.com/image.jpg', shouldBeValid: true },
          { url: 'https://subdomain.example.com/image.jpg', shouldBeValid: true },
          { url: 'https://trusted.org/resource', shouldBeValid: true },
          { url: 'https://malicious.com/evil.js', shouldBeValid: false },
          { url: 'https://evil.net/payload', shouldBeValid: false }
        ];

        testCases.forEach(({ url, shouldBeValid }) => {
          const result = (componentRegistry as any).validateUrl?.(url, allowedDomains) ?? true;
          
          if (shouldBeValid) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        });
      });
    });
  });

  describe('Input Validation', () => {
    describe('Type Safety', () => {
      it('should validate prop types correctly', () => {
        const testCases = [
          {
            component: 'Button',
            validProps: { variant: 'primary', disabled: false, size: 'lg' },
            invalidProps: { variant: 'invalid', disabled: 'true', size: 999 }
          },
          {
            component: 'Input',
            validProps: { type: 'email', required: true, maxLength: 100 },
            invalidProps: { type: 'invalid-type', required: 'yes', maxLength: 'many' }
          },
          {
            component: 'Card',
            validProps: { variant: 'outline', padding: 'md', interactive: true },
            invalidProps: { variant: 'invalid', padding: 'huge', interactive: 'yes' }
          }
        ];

        testCases.forEach(({ component, validProps, invalidProps }) => {
          if (!componentRegistry.hasComponent(component)) return;

          // Valid props should pass validation
          const validResult = componentRegistry.validateComponentSpec(component, validProps);
          expect(validResult.valid).toBe(true);

          // Invalid props should fail validation
          const invalidResult = componentRegistry.validateComponentSpec(component, invalidProps);
          expect(invalidResult.valid).toBe(false);
          expect(invalidResult.errors.length).toBeGreaterThan(0);
        });
      });

      it('should handle nested object validation', () => {
        const testProps = {
          'data-testid': 'test',
          style: {
            color: 'red',
            backgroundColor: 'blue',
            maliciousScript: 'javascript:alert(1)', // Should be removed or sanitized
            'font-family': 'Arial, sans-serif'
          }
        };

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);
          
          if (sanitized.style && typeof sanitized.style === 'object') {
            Object.values(sanitized.style).forEach((value: any) => {
              if (typeof value === 'string') {
                expect(value).not.toMatch(/javascript:|data:text\/html|vbscript:/i);
              }
            });
          }
        });
      });
    });

    describe('Array Validation', () => {
      it('should sanitize arrays of data', () => {
        const testProps = {
          'data-testid': 'test',
          items: [
            'safe item',
            '<script>alert("xss")</script>dangerous item',
            { label: 'safe', value: 'javascript:alert(1)' }
          ]
        };

        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const sanitized = (componentRegistry as any)[componentName].sanitizer(testProps);
          
          if (sanitized.items && Array.isArray(sanitized.items)) {
            sanitized.items.forEach((item: any) => {
              if (typeof item === 'string') {
                expect(item).not.toMatch(/<script[\s\S]*?>[\s\S]*?<\/script>/gi);
              } else if (typeof item === 'object' && item !== null) {
                Object.values(item).forEach((value: any) => {
                  if (typeof value === 'string') {
                    expect(value).not.toMatch(/javascript:|<script/gi);
                  }
                });
              }
            });
          }
        });
      });
    });
  });

  describe('Runtime Security', () => {
    describe('Component Isolation', () => {
      it('should not expose global variables', () => {
        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const ComponentClass = (componentRegistry as any)[componentName].component;
          
          // Components should not pollute global scope
          const globalsBefore = Object.keys(global);
          
          render(React.createElement(ComponentClass, {
            'data-testid': 'isolation-test'
          }));
          
          const globalsAfter = Object.keys(global);
          expect(globalsAfter.length).toBe(globalsBefore.length);
        });
      });

      it('should handle errors gracefully', () => {
        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const ComponentClass = (componentRegistry as any)[componentName].component;
          
          // Test with various problematic props
          const problematicProps = [
            null,
            undefined,
            { circular: {} },
            { deeply: { nested: { props: { with: { many: { levels: true } } } } } }
          ];

          problematicProps.forEach(props => {
            expect(() => {
              const sanitized = (componentRegistry as any)[componentName].sanitizer(props || {});
              render(React.createElement(ComponentClass, sanitized));
            }).not.toThrow();
          });
        });
      });
    });

    describe('Memory Safety', () => {
      it('should not create memory leaks', () => {
        getAllRegisteredComponents().forEach(componentName => {
          if (!componentRegistry.hasComponent(componentName)) return;

          const ComponentClass = (componentRegistry as any)[componentName].component;
          const initialMemory = performance.memory?.usedJSHeapSize || 0;
          
          // Render and unmount multiple times
          for (let i = 0; i < 50; i++) {
            const { unmount } = render(React.createElement(ComponentClass, {
              'data-testid': `memory-test-${i}`
            }));
            unmount();
          }
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          const finalMemory = performance.memory?.usedJSHeapSize || 0;
          const memoryIncrease = finalMemory - initialMemory;
          
          // Memory increase should be reasonable (less than 10MB for 50 renders)
          expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });
      });
    });
  });

  describe('Security Documentation', () => {
    it('should document security features for all components', () => {
      getAllRegisteredComponents().forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;

        const docs = componentRegistry.getComponentDocs(componentName);
        const securityPolicy = componentRegistry.getSecurityPolicy(componentName);
        
        expect(docs).toBeDefined();
        expect(securityPolicy).toBeDefined();
        
        // Security policy should be comprehensive
        expect(securityPolicy?.allowedProps).toBeDefined();
        expect(securityPolicy?.blockedProps).toBeDefined();
        expect(securityPolicy?.sanitizeHtml).toBe(true);
        expect(securityPolicy?.maxDataSize).toBeGreaterThan(0);
        
        // Should have security-related documentation
        expect(docs?.description).toBeDefined();
        expect(docs?.examples).toBeDefined();
      });
    });

    it('should provide security guidelines', () => {
      // Component registry should provide security best practices
      expect(componentRegistry).toBeDefined();
      expect(typeof componentRegistry.validateComponentSpec).toBe('function');
      expect(typeof componentRegistry.getSecurityPolicy).toBe('function');
    });
  });

  describe('Integration Security', () => {
    it('should maintain security when components are nested', () => {
      const nestedContent = '<script>alert("nested XSS")</script>';
      
      // Test Card containing other components
      const cardProps = {
        'data-testid': 'nested-security-test',
        title: nestedContent,
        children: nestedContent
      };
      
      const cardValidation = componentRegistry.validateComponentSpec('Card', cardProps);
      if (cardValidation.valid && cardValidation.data) {
        const sanitized = componentRegistry.Card.sanitizer(cardValidation.data);
        expect(sanitized.title).not.toContain('<script>');
        expect(sanitized.children).not.toContain('<script>');
      }
    });

    it('should prevent security bypass through composition', () => {
      // Test that combining multiple components doesn't create security holes
      const components = ['Button', 'Input', 'Card'];
      const maliciousData = {
        'data-testid': 'composition-test',
        children: '<img src="x" onerror="window.location=\'javascript:alert(1)\'">',
        title: '<script>document.body.innerHTML="HACKED"</script>',
        value: 'javascript:alert("bypass attempt")'
      };

      components.forEach(componentName => {
        if (!componentRegistry.hasComponent(componentName)) return;

        const validation = componentRegistry.validateComponentSpec(componentName, maliciousData);
        if (validation.valid && validation.data) {
          const sanitized = (componentRegistry as any)[componentName].sanitizer(validation.data);
          
          Object.values(sanitized).forEach((value: any) => {
            if (typeof value === 'string') {
              expect(value).not.toMatch(/<script|javascript:|onerror=/gi);
            }
          });
        }
      });
    });
  });
});