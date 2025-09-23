/**
 * Custom ESLint Rules for Hook Violation Prevention
 * NLD Pattern Analysis Integration
 */

module.exports = {
  rules: {
    'hooks-placement': {
      meta: {
        type: 'error',
        docs: {
          description: 'Enforce hooks placement at the top of functional components',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
      },

      create(context) {
        let componentDepth = 0;
        let hasEarlyReturn = false;
        let hookCalls = [];
        let earlyReturns = [];

        return {
          'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
            // Track component depth for nested function detection
            if (isReactComponent(node)) {
              componentDepth++;
              hasEarlyReturn = false;
              hookCalls = [];
              earlyReturns = [];
            }
          },

          'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression:exit'(node) {
            if (isReactComponent(node)) {
              componentDepth--;

              // Check for violations
              checkHookPlacement(context, hookCalls, earlyReturns);
            }
          },

          CallExpression(node) {
            if (componentDepth > 0 && isHookCall(node)) {
              hookCalls.push({
                node,
                line: node.loc.start.line,
                afterEarlyReturn: hasEarlyReturn
              });
            }
          },

          ReturnStatement(node) {
            if (componentDepth > 0 && isEarlyReturn(node)) {
              hasEarlyReturn = true;
              earlyReturns.push({
                node,
                line: node.loc.start.line
              });
            }
          },

          // Check for hooks in loops
          'WhileStatement, DoWhileStatement, ForStatement, ForInStatement, ForOfStatement'(node) {
            if (componentDepth > 0) {
              checkForHooksInLoop(context, node);
            }
          },

          // Check for hooks in conditions
          IfStatement(node) {
            if (componentDepth > 0) {
              checkForHooksInCondition(context, node);
            }
          },

          // Check for hooks in array methods
          'CallExpression[callee.property.name=/^(map|forEach|filter|reduce)$/]'(node) {
            if (componentDepth > 0) {
              checkForHooksInArrayMethod(context, node);
            }
          }
        };

        function isReactComponent(node) {
          // Check if function is a React component
          const name = node.id?.name || node.key?.name;
          return name && /^[A-Z]/.test(name);
        }

        function isHookCall(node) {
          return (
            node.callee &&
            node.callee.name &&
            node.callee.name.startsWith('use') &&
            /^use[A-Z]/.test(node.callee.name)
          );
        }

        function isEarlyReturn(node) {
          // Check if this is an early return (not the last statement)
          const parent = node.parent;
          if (parent.type === 'BlockStatement') {
            const statements = parent.body;
            const returnIndex = statements.indexOf(node);
            return returnIndex < statements.length - 1;
          }
          return false;
        }

        function checkHookPlacement(context, hookCalls, earlyReturns) {
          hookCalls.forEach(hook => {
            if (hook.afterEarlyReturn) {
              const earliestReturn = earlyReturns[0];
              context.report({
                node: hook.node,
                message: `Hook "${hook.node.callee.name}" is called after early return on line ${earliestReturn.line}. Move all hooks to the top of the component.`,
                fix(fixer) {
                  // Suggest moving hook to the top
                  return fixer.insertTextBefore(
                    hookCalls[0].node,
                    `// TODO: Move this hook to the top of the component\n`
                  );
                }
              });
            }
          });
        }

        function checkForHooksInLoop(context, loopNode) {
          const sourceCode = context.getSourceCode();
          const loopText = sourceCode.getText(loopNode);

          // Check if loop contains hook calls
          const hookRegex = /use[A-Z]\w*\s*\(/g;
          if (hookRegex.test(loopText)) {
            context.report({
              node: loopNode,
              message: 'Hooks cannot be called inside loops. This creates variable hook counts.'
            });
          }
        }

        function checkForHooksInCondition(context, ifNode) {
          const sourceCode = context.getSourceCode();
          const consequentText = sourceCode.getText(ifNode.consequent);
          const alternateText = ifNode.alternate ? sourceCode.getText(ifNode.alternate) : '';

          const hookRegex = /use[A-Z]\w*\s*\(/g;
          if (hookRegex.test(consequentText) || hookRegex.test(alternateText)) {
            context.report({
              node: ifNode,
              message: 'Hooks cannot be called inside conditions. Use useMemo or useCallback for conditional values.'
            });
          }
        }

        function checkForHooksInArrayMethod(context, callNode) {
          const sourceCode = context.getSourceCode();
          const callText = sourceCode.getText(callNode);

          const hookRegex = /use[A-Z]\w*\s*\(/g;
          if (hookRegex.test(callText)) {
            context.report({
              node: callNode,
              message: `Hooks cannot be called inside ${callNode.callee.property.name}. This creates variable hook counts.`
            });
          }
        }
      }
    },

    'consistent-hook-count': {
      meta: {
        type: 'error',
        docs: {
          description: 'Enforce consistent hook count across all render paths',
          category: 'Best Practices',
          recommended: true,
        },
        schema: [],
      },

      create(context) {
        const componentHookCounts = new Map();

        return {
          'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
            if (isReactComponent(node)) {
              const componentName = getComponentName(node);
              const hookCount = countHooks(context, node);

              if (componentHookCounts.has(componentName)) {
                const previousCount = componentHookCounts.get(componentName);
                if (hookCount !== previousCount) {
                  context.report({
                    node,
                    message: `Hook count mismatch in ${componentName}: expected ${previousCount}, found ${hookCount}. This can cause "rendered more hooks" errors.`
                  });
                }
              } else {
                componentHookCounts.set(componentName, hookCount);
              }
            }
          }
        };

        function isReactComponent(node) {
          const name = getComponentName(node);
          return name && /^[A-Z]/.test(name);
        }

        function getComponentName(node) {
          return node.id?.name || node.key?.name || 'AnonymousComponent';
        }

        function countHooks(context, node) {
          const sourceCode = context.getSourceCode();
          const text = sourceCode.getText(node);
          const hookRegex = /use[A-Z]\w*\s*\(/g;
          const matches = text.match(hookRegex);
          return matches ? matches.length : 0;
        }
      }
    },

    'no-hooks-in-callbacks': {
      meta: {
        type: 'error',
        docs: {
          description: 'Prevent hooks from being called in callbacks or event handlers',
          category: 'Best Practices',
          recommended: true,
        },
        schema: [],
      },

      create(context) {
        let callbackDepth = 0;

        return {
          'CallExpression[callee.property.name=/^(addEventListener|setTimeout|setInterval|then|catch|finally)$/]'(node) {
            callbackDepth++;
          },

          'CallExpression[callee.property.name=/^(addEventListener|setTimeout|setInterval|then|catch|finally)$/]:exit'(node) {
            callbackDepth--;
          },

          'FunctionExpression, ArrowFunctionExpression'(node) {
            if (isCallback(node)) {
              callbackDepth++;
            }
          },

          'FunctionExpression, ArrowFunctionExpression:exit'(node) {
            if (isCallback(node)) {
              callbackDepth--;
            }
          },

          CallExpression(node) {
            if (callbackDepth > 0 && isHookCall(node)) {
              context.report({
                node,
                message: `Hook "${node.callee.name}" cannot be called inside callbacks or event handlers. Move it to the component body.`
              });
            }
          }
        };

        function isCallback(node) {
          const parent = node.parent;
          return (
            parent.type === 'CallExpression' ||
            parent.type === 'Property' ||
            (parent.type === 'AssignmentExpression' &&
             parent.left.property &&
             parent.left.property.name.startsWith('on'))
          );
        }

        function isHookCall(node) {
          return (
            node.callee &&
            node.callee.name &&
            node.callee.name.startsWith('use') &&
            /^use[A-Z]/.test(node.callee.name)
          );
        }
      }
    }
  },

  configs: {
    recommended: {
      plugins: ['@custom/react-hooks'],
      rules: {
        '@custom/react-hooks/hooks-placement': 'error',
        '@custom/react-hooks/consistent-hook-count': 'error',
        '@custom/react-hooks/no-hooks-in-callbacks': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn'
      }
    }
  }
};

// Utility function to analyze component for hook violations
function analyzeComponentForViolations(source) {
  const violations = [];

  // Check for post-conditional hooks
  const postConditionalPattern = /if\s*\([^)]+\)\s*return[^;]*;[\s\S]*?(?:const\s*\[[^\]]+\]\s*=\s*use[A-Z]|use[A-Z])/g;
  let match;

  while ((match = postConditionalPattern.exec(source)) !== null) {
    violations.push({
      type: 'post-conditional-hook',
      index: match.index,
      message: 'Hook called after conditional return'
    });
  }

  return violations;
}

// Export for use in build tools
module.exports.analyzeComponentForViolations = analyzeComponentForViolations;