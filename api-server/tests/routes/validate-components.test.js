import request from 'supertest';
import express from 'express';
import validateComponentsRouter from '../../routes/validate-components.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/validate-components', validateComponentsRouter);

describe('POST /api/validate-components', () => {
  describe('Valid components', () => {
    test('should pass validation for valid Metric component', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Metric',
              props: {
                value: 42,
                label: 'Total Users'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.componentCount).toBe(1);
    });

    test('should pass validation for valid Badge component', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Badge',
              props: {
                variant: 'secondary',
                children: 'Active'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
    });

    test('should pass validation for valid Button component', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Button',
              props: {
                variant: 'outline',
                children: 'Click Me'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    test('should pass validation for multiple valid components', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Metric',
              props: {
                value: '150',
                label: 'Active Tasks',
                description: 'Tasks in progress'
              }
            },
            {
              type: 'Badge',
              props: {
                variant: 'default',
                children: 'New'
              }
            },
            {
              type: 'Card',
              props: {
                title: 'Dashboard',
                description: 'Main dashboard view'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.componentCount).toBe(3);
    });
  });

  describe('Missing required fields', () => {
    test('should fail validation for Metric without label', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Metric',
              props: {
                value: 42
                // missing label
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        path: 'components[0]',
        type: 'Metric'
      });
      expect(response.body.errors[0].issues).toBeDefined();
      expect(response.body.errors[0].issues[0].field).toBe('label');
    });

    test('should fail validation for Badge without children', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Badge',
              props: {
                variant: 'secondary'
                // missing children
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors[0].issues[0].field).toBe('children');
    });

    test('should fail validation for Button without children', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Button',
              props: {
                variant: 'default'
                // missing children
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors[0].issues[0].field).toBe('children');
    });
  });

  describe('Invalid enum values', () => {
    test('should fail validation for Badge with invalid variant', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Badge',
              props: {
                variant: 'success', // invalid variant
                children: 'Test'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].issues[0].field).toBe('variant');
    });

    test('should fail validation for Button with invalid variant', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Button',
              props: {
                variant: 'primary', // invalid variant
                children: 'Click'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Unknown component types', () => {
    test('should fail validation for unknown component type', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'UnknownComponent',
              props: {
                test: 'value'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        path: 'components[0]',
        type: 'UnknownComponent',
        message: 'Unknown component type: UnknownComponent'
      });
    });
  });

  describe('Multiple validation errors', () => {
    test('should return all validation errors for multiple invalid components', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Metric',
              props: {
                value: 42
                // missing label
              }
            },
            {
              type: 'Badge',
              props: {
                variant: 'invalid',
                children: 'Test'
              }
            },
            {
              type: 'UnknownType',
              props: {}
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Nested component validation', () => {
    test('should validate nested components in Card children', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Card',
              props: {
                title: 'Stats Card'
              },
              children: [
                {
                  type: 'Metric',
                  props: {
                    value: 100
                    // missing label
                  }
                }
              ]
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].path).toBe('components[0].children[0]');
    });

    test('should validate deeply nested components', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Grid',
              props: {
                cols: 2
              },
              children: [
                {
                  type: 'Card',
                  props: {
                    title: 'Card 1'
                  },
                  children: [
                    {
                      type: 'Badge',
                      props: {
                        // missing children
                        variant: 'default'
                      }
                    }
                  ]
                }
              ]
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors[0].path).toBe('components[0].children[0].children[0]');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty components array', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: []
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.componentCount).toBe(0);
    });

    test('should fail validation for non-array input', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('components must be an array');
    });

    test('should fail validation for missing components field', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Performance', () => {
    test('should handle large component tree efficiently', async () => {
      // Generate 100 valid components
      const components = Array.from({ length: 100 }, (_, i) => ({
        type: 'Metric',
        props: {
          value: i,
          label: `Metric ${i}`
        }
      }));

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/validate-components')
        .send({ components });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.componentCount).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Component-specific validations', () => {
    test('should validate header component', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'header',
              props: {
                title: 'Dashboard',
                level: 2,
                subtitle: 'Welcome'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    test('should fail validation for header without title', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'header',
              props: {
                level: 2
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
    });

    test('should validate ProfileHeader component', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'ProfileHeader',
              props: {
                name: 'John Doe',
                description: 'Software Engineer',
                status: 'active'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    test('should validate CapabilityList component', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'CapabilityList',
              props: {
                title: 'Skills',
                capabilities: ['JavaScript', 'React', 'Node.js']
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });
  });

  describe('Response format', () => {
    test('should include timestamp in response', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            {
              type: 'Metric',
              props: {
                value: 10,
                label: 'Test'
              }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    test('should include componentCount in response', async () => {
      const response = await request(app)
        .post('/api/validate-components')
        .send({
          components: [
            { type: 'Metric', props: { value: 1, label: 'A' } },
            { type: 'Badge', props: { children: 'B' } },
            { type: 'Button', props: { children: 'C' } }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.componentCount).toBe(3);
    });
  });
});
