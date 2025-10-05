import React from 'react'
import { AlertCircle } from 'lucide-react'
import { ZodError } from 'zod'

interface ValidationErrorProps {
  componentType: string
  errors: ZodError
}

export const ValidationError: React.FC<ValidationErrorProps> = ({
  componentType,
  errors
}) => {
  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 my-4">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900">
            Component Validation Error
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Component type: <code className="bg-red-100 px-2 py-0.5 rounded font-mono">{componentType}</code>
          </p>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-red-900">Issues found:</p>
            <ul className="space-y-2">
              {errors.errors.map((error, idx) => (
                <li key={idx} className="text-sm bg-white rounded p-3 border border-red-200">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-red-600">
                      {error.path.join('.') || 'root'}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="text-red-700">{error.message}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-blue-900">
              <strong>Tip:</strong> Check the component schema documentation at
              <code className="ml-1 bg-blue-100 px-1 rounded">/api/components/catalog</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
