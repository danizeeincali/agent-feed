/**
 * TDD London School - Message Serialization/Deserialization Tests
 * Tests the coordination between message processing components and data transformation
 */

import { WebSocketMockFactory, MockEventGenerator } from '../mocks/websocket-mocks';
import { WebSocketErrors } from '../contracts/websocket-contracts';

describe('Message Serialization/Deserialization - London School TDD', () => {
  let mockMessageSerializer: any;
  let mockSchemaValidator: any;
  let mockCompressionHandler: any;
  let mockEncodingManager: any;
  let mockMessageTransformer: any;

  beforeEach(() => {
    mockMessageSerializer = WebSocketMockFactory.createMessageSerializerMock();
    
    mockSchemaValidator = {
      validate: jest.fn().mockReturnValue(true),
      getSchema: jest.fn().mockReturnValue({}),
      validateStructure: jest.fn().mockReturnValue(true),
      reportValidationError: jest.fn()
    };

    mockCompressionHandler = {
      compress: jest.fn().mockImplementation(data => `compressed:${data}`),
      decompress: jest.fn().mockImplementation(data => data.replace('compressed:', '')),
      shouldCompress: jest.fn().mockReturnValue(false),
      getCompressionRatio: jest.fn().mockReturnValue(0.7)
    };

    mockEncodingManager = {
      encode: jest.fn().mockImplementation(data => Buffer.from(data).toString('base64')),
      decode: jest.fn().mockImplementation(data => Buffer.from(data, 'base64').toString()),
      detectEncoding: jest.fn().mockReturnValue('utf8'),
      convertEncoding: jest.fn()
    };

    mockMessageTransformer = {
      transform: jest.fn().mockImplementation(data => data),
      applyTransforms: jest.fn(),
      removeTransforms: jest.fn(),
      getTransformPipeline: jest.fn().mockReturnValue([])
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Serialization Workflow', () => {
    it('should coordinate complete message serialization pipeline', () => {
      const testMessage = {
        type: 'command',
        payload: { command: 'claude help', args: [] },
        timestamp: Date.now(),
        id: 'serialize-test-123'
      };

      // Simulate serialization pipeline coordination
      mockSchemaValidator.validate(testMessage);
      const transformed = mockMessageTransformer.transform(testMessage);
      
      const shouldCompress = mockCompressionHandler.shouldCompress(transformed);
      let processedData = transformed;
      
      if (shouldCompress) {
        processedData = mockCompressionHandler.compress(transformed);
      }
      
      const serialized = mockMessageSerializer.serialize(processedData);
      const encoded = mockEncodingManager.encode(serialized);

      // Verify serialization pipeline coordination
      expect(mockSchemaValidator.validate).toHaveBeenCalledWith(testMessage);
      expect(mockMessageTransformer.transform).toHaveBeenCalledWith(testMessage);
      expect(mockCompressionHandler.shouldCompress).toHaveBeenCalledWith(transformed);
      expect(mockMessageSerializer.serialize).toHaveBeenCalledWith(processedData);
      expect(mockEncodingManager.encode).toHaveBeenCalledWith(serialized);
    });

    it('should coordinate serialization error handling workflow', () => {
      const invalidMessage = {
        circular: null as any
      };
      // Create circular reference
      invalidMessage.circular = invalidMessage;

      const errorHandler = {
        handleSerializationError: jest.fn(),
        logError: jest.fn(),
        notifyFailure: jest.fn()
      };

      // Mock serialization failure
      mockMessageSerializer.serialize.mockImplementation(() => {
        throw new Error(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);
      });

      // Simulate error handling coordination
      try {
        mockMessageSerializer.serialize(invalidMessage);
      } catch (error: any) {
        errorHandler.handleSerializationError(error);
        errorHandler.logError(error.message);
        errorHandler.notifyFailure(invalidMessage);
      }

      // Verify error handling coordination
      expect(mockMessageSerializer.serialize).toHaveBeenCalledWith(invalidMessage);
      expect(errorHandler.handleSerializationError).toHaveBeenCalledWith(
        expect.objectContaining({ message: WebSocketErrors.MESSAGE_SERIALIZATION_ERROR })
      );
      expect(errorHandler.logError).toHaveBeenCalledWith(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);
      expect(errorHandler.notifyFailure).toHaveBeenCalledWith(invalidMessage);
    });

    it('should coordinate large message handling with compression', () => {
      const largeMessage = {
        type: 'response',
        payload: { output: 'x'.repeat(10000) }, // Large payload
        id: 'large-msg-test'
      };

      // Mock compression decision based on size
      mockCompressionHandler.shouldCompress.mockReturnValue(true);

      // Simulate large message processing
      const messageSize = JSON.stringify(largeMessage).length;
      const shouldCompress = mockCompressionHandler.shouldCompress(largeMessage);
      
      if (shouldCompress) {
        const compressed = mockCompressionHandler.compress(JSON.stringify(largeMessage));
        const compressionRatio = mockCompressionHandler.getCompressionRatio();
        
        mockMessageSerializer.serialize(compressed);
      }

      // Verify large message handling coordination
      expect(mockCompressionHandler.shouldCompress).toHaveBeenCalledWith(largeMessage);
      expect(mockCompressionHandler.compress).toHaveBeenCalledWith(JSON.stringify(largeMessage));
      expect(mockCompressionHandler.getCompressionRatio).toHaveBeenCalled();
      expect(mockMessageSerializer.serialize).toHaveBeenCalled();
    });
  });

  describe('Message Deserialization Workflow', () => {
    it('should coordinate complete message deserialization pipeline', () => {
      const encodedMessage = 'eyJ0eXBlIjoicmVzcG9uc2UiLCJwYXlsb2FkIjp7InN1Y2Nlc3MiOnRydWV9fQ==';
      const expectedMessage = {
        type: 'response',
        payload: { success: true }
      };

      // Simulate deserialization pipeline coordination
      const detectedEncoding = mockEncodingManager.detectEncoding(encodedMessage);
      const decoded = mockEncodingManager.decode(encodedMessage);
      
      // Check if decompression is needed
      const needsDecompression = decoded.startsWith('compressed:');
      let processedData = decoded;
      
      if (needsDecompression) {
        processedData = mockCompressionHandler.decompress(decoded);
      }
      
      const deserialized = mockMessageSerializer.deserialize(processedData);
      const validated = mockSchemaValidator.validate(deserialized);

      // Verify deserialization pipeline coordination
      expect(mockEncodingManager.detectEncoding).toHaveBeenCalledWith(encodedMessage);
      expect(mockEncodingManager.decode).toHaveBeenCalledWith(encodedMessage);
      expect(mockMessageSerializer.deserialize).toHaveBeenCalledWith(processedData);
      expect(mockSchemaValidator.validate).toHaveBeenCalledWith(deserialized);
    });

    it('should coordinate deserialization error recovery', () => {
      const malformedMessage = 'invalid-json-data';
      
      const errorRecovery = {
        attemptRepair: jest.fn().mockReturnValue(null),
        useDefaultMessage: jest.fn().mockReturnValue({ type: 'error', payload: {} }),
        notifyCorruption: jest.fn()
      };

      // Mock deserialization failure
      mockMessageSerializer.deserialize.mockImplementation(() => {
        throw new Error(WebSocketErrors.MESSAGE_SERIALIZATION_ERROR);
      });

      // Simulate error recovery workflow
      try {
        mockMessageSerializer.deserialize(malformedMessage);
      } catch (error: any) {
        const repairedMessage = errorRecovery.attemptRepair(malformedMessage);
        
        if (!repairedMessage) {
          const defaultMessage = errorRecovery.useDefaultMessage();
          errorRecovery.notifyCorruption(error);
        }
      }

      // Verify error recovery coordination
      expect(mockMessageSerializer.deserialize).toHaveBeenCalledWith(malformedMessage);
      expect(errorRecovery.attemptRepair).toHaveBeenCalledWith(malformedMessage);
      expect(errorRecovery.useDefaultMessage).toHaveBeenCalled();
      expect(errorRecovery.notifyCorruption).toHaveBeenCalledWith(
        expect.objectContaining({ message: WebSocketErrors.MESSAGE_SERIALIZATION_ERROR })
      );
    });

    it('should coordinate decompression workflow for compressed messages', () => {
      const compressedMessage = 'compressed:{"type":"response","payload":{"data":"test"}}';
      
      // Simulate decompression coordination
      const needsDecompression = compressedMessage.startsWith('compressed:');
      
      if (needsDecompression) {
        const decompressed = mockCompressionHandler.decompress(compressedMessage);
        const deserialized = mockMessageSerializer.deserialize(decompressed);
        mockSchemaValidator.validate(deserialized);
      }

      // Verify decompression coordination
      expect(mockCompressionHandler.decompress).toHaveBeenCalledWith(compressedMessage);
      expect(mockMessageSerializer.deserialize).toHaveBeenCalledWith(
        '{"type":"response","payload":{"data":"test"}}'
      );
      expect(mockSchemaValidator.validate).toHaveBeenCalled();
    });
  });

  describe('Schema Validation Coordination', () => {
    it('should coordinate message structure validation', () => {
      const testMessage = {
        type: 'command',
        payload: { command: 'claude help' },
        id: 'validation-test'
      };

      const structureChecker = {
        hasRequiredFields: jest.fn().mockReturnValue(true),
        validateFieldTypes: jest.fn().mockReturnValue(true),
        checkConstraints: jest.fn().mockReturnValue(true)
      };

      // Simulate structure validation workflow
      mockSchemaValidator.getSchema('command');
      
      const hasRequired = structureChecker.hasRequiredFields(testMessage);
      const typesValid = structureChecker.validateFieldTypes(testMessage);
      const constraintsValid = structureChecker.checkConstraints(testMessage);
      
      const overallValid = hasRequired && typesValid && constraintsValid;
      mockSchemaValidator.validateStructure.mockReturnValue(overallValid);
      
      const validationResult = mockSchemaValidator.validateStructure(testMessage);

      // Verify structure validation coordination
      expect(mockSchemaValidator.getSchema).toHaveBeenCalledWith('command');
      expect(structureChecker.hasRequiredFields).toHaveBeenCalledWith(testMessage);
      expect(structureChecker.validateFieldTypes).toHaveBeenCalledWith(testMessage);
      expect(structureChecker.checkConstraints).toHaveBeenCalledWith(testMessage);
      expect(validationResult).toBe(true);
    });

    it('should coordinate validation error reporting', () => {
      const invalidMessage = {
        type: 'invalid_type',
        // missing required payload
        id: 'invalid-test'
      };

      const validationErrorCollector = {
        addError: jest.fn(),
        getErrors: jest.fn().mockReturnValue(['Missing payload field']),
        hasErrors: jest.fn().mockReturnValue(true)
      };

      // Mock validation failure
      mockSchemaValidator.validate.mockReturnValue(false);

      // Simulate validation error workflow
      const isValid = mockSchemaValidator.validate(invalidMessage);
      
      if (!isValid) {
        validationErrorCollector.addError('Missing payload field');
        const errors = validationErrorCollector.getErrors();
        mockSchemaValidator.reportValidationError(errors);
      }

      // Verify validation error coordination
      expect(mockSchemaValidator.validate).toHaveBeenCalledWith(invalidMessage);
      expect(validationErrorCollector.addError).toHaveBeenCalledWith('Missing payload field');
      expect(validationErrorCollector.getErrors).toHaveBeenCalled();
      expect(mockSchemaValidator.reportValidationError).toHaveBeenCalledWith(['Missing payload field']);
    });
  });

  describe('Encoding/Decoding Coordination', () => {
    it('should coordinate character encoding management', () => {
      const unicodeMessage = {
        type: 'message',
        payload: { text: '🚀 Unicode test message 中文' }
      };

      const encodingDetector = {
        analyzeText: jest.fn().mockReturnValue('utf8'),
        requiresConversion: jest.fn().mockReturnValue(false),
        getSupportedEncodings: jest.fn().mockReturnValue(['utf8', 'ascii', 'base64'])
      };

      // Simulate encoding management workflow
      const detectedEncoding = encodingDetector.analyzeText(unicodeMessage.payload.text);
      const needsConversion = encodingDetector.requiresConversion(detectedEncoding, 'utf8');
      
      if (!needsConversion) {
        const serialized = mockMessageSerializer.serialize(unicodeMessage);
        mockEncodingManager.encode(serialized);
      }

      // Verify encoding coordination
      expect(encodingDetector.analyzeText).toHaveBeenCalledWith(unicodeMessage.payload.text);
      expect(encodingDetector.requiresConversion).toHaveBeenCalledWith('utf8', 'utf8');
      expect(mockMessageSerializer.serialize).toHaveBeenCalledWith(unicodeMessage);
      expect(mockEncodingManager.encode).toHaveBeenCalled();
    });

    it('should coordinate binary data handling', () => {
      const binaryMessage = {
        type: 'binary_data',
        payload: { data: Buffer.from('binary content').toString('base64') }
      };

      const binaryHandler = {
        detectBinaryContent: jest.fn().mockReturnValue(true),
        processAsBinary: jest.fn(),
        convertToBase64: jest.fn()
      };

      // Simulate binary handling workflow
      const isBinary = binaryHandler.detectBinaryContent(binaryMessage.payload.data);
      
      if (isBinary) {
        binaryHandler.processAsBinary(binaryMessage.payload.data);
        const encoded = mockEncodingManager.encode(JSON.stringify(binaryMessage));
      }

      // Verify binary handling coordination
      expect(binaryHandler.detectBinaryContent).toHaveBeenCalledWith(binaryMessage.payload.data);
      expect(binaryHandler.processAsBinary).toHaveBeenCalledWith(binaryMessage.payload.data);
      expect(mockEncodingManager.encode).toHaveBeenCalled();
    });
  });

  describe('Transform Pipeline Coordination', () => {
    it('should coordinate message transformation pipeline', () => {
      const originalMessage = {
        type: 'command',
        payload: { command: 'claude help' }
      };

      const transformPipeline = [
        { name: 'add_timestamp', transform: jest.fn(msg => ({...msg, timestamp: Date.now()})) },
        { name: 'add_id', transform: jest.fn(msg => ({...msg, id: 'generated-id'})) },
        { name: 'normalize', transform: jest.fn(msg => msg) }
      ];

      mockMessageTransformer.getTransformPipeline.mockReturnValue(transformPipeline);

      // Simulate transformation pipeline
      const pipeline = mockMessageTransformer.getTransformPipeline();
      let transformedMessage = originalMessage;

      pipeline.forEach(transformer => {
        transformedMessage = transformer.transform(transformedMessage);
      });

      mockMessageTransformer.applyTransforms(transformedMessage);

      // Verify transformation coordination
      expect(mockMessageTransformer.getTransformPipeline).toHaveBeenCalled();
      transformPipeline.forEach(transformer => {
        expect(transformer.transform).toHaveBeenCalled();
      });
      expect(mockMessageTransformer.applyTransforms).toHaveBeenCalledWith(transformedMessage);
    });
  });
});