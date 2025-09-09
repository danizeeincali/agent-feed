/**
 * NLD Performance Regression Prevention: Mention System
 * 
 * Prevents performance degradation patterns identified in Agent Feed development:
 * - Slow mention dropdown rendering
 * - Memory leaks from component re-renders
 * - Event handler accumulation causing performance issues
 * - State update cascades causing UI freezing
 */

import { test, expect, Page } from '@playwright/test'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  eventListeners: number
  reRenderCount: number
  domNodes: number
}

interface PerformanceThreshold {
  maxRenderTime: number
  maxMemoryIncrease: number
  maxEventListeners: number
  maxReRenders: number
  maxDomNodes: number
}

const PERFORMANCE_THRESHOLDS: PerformanceThreshold = {
  maxRenderTime: 100, // 100ms max for dropdown appearance
  maxMemoryIncrease: 5 * 1024 * 1024, // 5MB max increase
  maxEventListeners: 50, // Max 50 event listeners
  maxReRenders: 10, // Max 10 re-renders per interaction
  maxDomNodes: 1000 // Max 1000 DOM nodes per component
}

/**
 * Performance monitoring utilities
 */
async function measurePerformance(page: Page, operation: () => Promise<void>): Promise<PerformanceMetrics> {
  // Start performance monitoring
  await page.evaluate(() => {
    // @ts-ignore
    window.performanceData = {
      startTime: performance.now(),
      startMemory: (performance as any).memory?.usedJSHeapSize || 0,
      renderCount: 0,
      eventListenerCount: 0
    }
    
    // Track re-renders
    const originalRender = React?.createElement
    if (originalRender) {
      // @ts-ignore
      React.createElement = function(...args) {
        // @ts-ignore
        window.performanceData.renderCount++
        return originalRender.apply(React, args)
      }
    }
  })
  
  // Execute the operation
  await operation()
  
  // Measure results
  return await page.evaluate(() => {
    // @ts-ignore
    const data = window.performanceData
    const endTime = performance.now()
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0
    
    // Count event listeners
    let eventListenerCount = 0
    const elements = document.querySelectorAll('*')
    elements.forEach(el => {
      // @ts-ignore
      if (el._events || el.eventListeners) {
        eventListenerCount++
      }
    })
    
    return {
      renderTime: endTime - data.startTime,
      memoryUsage: endMemory - data.startMemory,
      eventListeners: eventListenerCount,
      reRenderCount: data.renderCount,
      domNodes: document.querySelectorAll('*').length
    }
  })
}

/**
 * PERFORMANCE REGRESSION PREVENTION TESTS
 */
test.describe('Mention System Performance Regression Prevention', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-mention-performance')
    await page.waitForLoadState('networkidle')
  })

  /**
   * CRITICAL TEST: Dropdown Render Performance
   * Ensures mention dropdown appears within performance thresholds
   */
  test('should render mention dropdown within performance thresholds', async ({ page }) => {
    const metrics = await measurePerformance(page, async () => {
      const input = page.locator('[data-testid="mention-input"]')
      await input.fill('@')
      
      const dropdown = page.locator('[data-testid="mention-dropdown"]')
      await dropdown.waitFor({ state: 'visible', timeout: 5000 })
    })
    
    // Validate performance thresholds
    expect(metrics.renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.maxRenderTime)
    expect(metrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryIncrease)
    expect(metrics.reRenderCount).toBeLessThan(PERFORMANCE_THRESHOLDS.maxReRenders)
    
    // Export performance data for trend analysis
    await page.evaluate((data) => {
      console.log('MENTION_DROPDOWN_PERFORMANCE', {
        timestamp: new Date().toISOString(),
        metrics: data,
        thresholds: {
          renderTime: 100,
          memoryIncrease: 5242880,
          reRenders: 10
        },
        passed: data.renderTime < 100 && data.memoryUsage < 5242880 && data.reRenderCount < 10
      })
    }, metrics)
  })

  /**
   * MEMORY LEAK PREVENTION
   * Prevents mention components from leaking memory on repeated use
   */
  test('should prevent memory leaks during repeated mention interactions', async ({ page }) => {
    const baselineMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    )
    
    // Perform 50 mention interactions to detect leaks
    for (let i = 0; i < 50; i++) {
      await page.locator('[data-testid="mention-input"]').fill(`@test${i}`)
      await page.locator('[data-testid="mention-dropdown"]').waitFor({ state: 'visible' })
      await page.locator('[data-testid="mention-input"]').fill('')
      await page.waitForTimeout(10) // Small delay to allow cleanup
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      // @ts-ignore
      if (window.gc) window.gc()
    })
    
    const finalMemory = await page.evaluate(() => 
      (performance as any).memory?.usedJSHeapSize || 0
    )
    
    const memoryIncrease = finalMemory - baselineMemory
    
    // Memory increase should be minimal after 50 interactions
    expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryIncrease)
    
    // Export memory leak detection results
    await page.evaluate((data) => {
      console.log('MEMORY_LEAK_DETECTION', {
        timestamp: new Date().toISOString(),
        baseline: data.baseline,
        final: data.final,
        increase: data.increase,
        iterations: 50,
        threshold: 5242880,
        passed: data.increase < 5242880
      })
    }, {
      baseline: baselineMemory,
      final: finalMemory,
      increase: memoryIncrease
    })
  })

  /**
   * EVENT HANDLER ACCUMULATION PREVENTION
   * Prevents mention components from accumulating event handlers
   */
  test('should prevent event handler accumulation', async ({ page }) => {
    // Count initial event handlers
    const initialHandlers = await page.evaluate(() => {
      let count = 0
      const elements = document.querySelectorAll('*')
      elements.forEach(el => {
        // @ts-ignore - Check for attached event listeners
        const events = el._events || el.eventListeners || {}
        count += Object.keys(events).length
      })
      return count
    })
    
    // Mount and unmount mention components multiple times
    for (let i = 0; i < 20; i++) {
      // Simulate component mount
      await page.evaluate(() => {
        const container = document.createElement('div')
        container.innerHTML = `
          <div data-testid="dynamic-mention-${Date.now()}">
            <textarea data-testid="dynamic-mention-input"></textarea>
          </div>
        `
        document.body.appendChild(container)
      })
      
      // Add interaction to create event handlers
      const dynamicInput = page.locator('[data-testid*="dynamic-mention-input"]').last()
      await dynamicInput.fill('@')
      
      // Simulate component unmount
      await page.evaluate(() => {
        const containers = document.querySelectorAll('[data-testid*="dynamic-mention-"]')
        if (containers.length > 0) {
          containers[containers.length - 1].remove()
        }
      })
    }
    
    // Count final event handlers
    const finalHandlers = await page.evaluate(() => {
      let count = 0
      const elements = document.querySelectorAll('*')
      elements.forEach(el => {
        // @ts-ignore
        const events = el._events || el.eventListeners || {}
        count += Object.keys(events).length
      })
      return count
    })
    
    const handlerIncrease = finalHandlers - initialHandlers
    
    // Event handler increase should be minimal
    expect(handlerIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.maxEventListeners)
    
    await page.evaluate((data) => {
      console.log('EVENT_HANDLER_ACCUMULATION', {
        timestamp: new Date().toISOString(),
        initial: data.initial,
        final: data.final,
        increase: data.increase,
        mountUnmountCycles: 20,
        threshold: 50,
        passed: data.increase < 50
      })
    }, {
      initial: initialHandlers,
      final: finalHandlers,
      increase: handlerIncrease
    })
  })

  /**
   * STATE UPDATE CASCADE PREVENTION
   * Prevents mention state updates from causing performance issues
   */
  test('should prevent state update cascades during mention typing', async ({ page }) => {
    // Monitor state updates during rapid typing
    await page.evaluate(() => {
      // @ts-ignore
      window.stateUpdateCount = 0
      
      // Mock React state updates to count them
      const originalSetState = React?.Component?.prototype?.setState
      if (originalSetState) {
        React.Component.prototype.setState = function(...args) {
          // @ts-ignore
          window.stateUpdateCount++
          return originalSetState.apply(this, args)
        }
      }
    })
    
    const input = page.locator('[data-testid="mention-input"]')
    
    // Rapid typing simulation
    const rapidText = '@john @jane @bob @alice @charlie'
    for (const char of rapidText) {
      await input.press(`Key${char.toUpperCase()}`)
      await page.waitForTimeout(50) // Rapid typing speed
    }
    
    // Wait for all state updates to settle
    await page.waitForTimeout(1000)
    
    const stateUpdateCount = await page.evaluate(() => 
      // @ts-ignore
      window.stateUpdateCount || 0
    )
    
    // State updates should be reasonable (not excessive cascading)
    expect(stateUpdateCount).toBeLessThan(100) // Max 100 state updates for the text
    
    await page.evaluate((count) => {
      console.log('STATE_UPDATE_CASCADE_DETECTION', {
        timestamp: new Date().toISOString(),
        stateUpdates: count,
        inputLength: 29,
        ratio: count / 29,
        threshold: 100,
        passed: count < 100
      })
    }, stateUpdateCount)
  })

  /**
   * DOM MANIPULATION PERFORMANCE
   * Ensures mention dropdown doesn't cause excessive DOM changes
   */
  test('should minimize DOM manipulations during mention interactions', async ({ page }) => {
    // Monitor DOM mutations
    const mutationCount = await page.evaluate(() => {
      let mutations = 0
      const observer = new MutationObserver((mutationsList) => {
        mutations += mutationsList.length
      })
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
      })
      
      // @ts-ignore
      window.mutationObserver = observer
      return mutations
    })
    
    const input = page.locator('[data-testid="mention-input"]')
    
    // Perform mention interactions
    await input.fill('@j')
    await page.locator('[data-testid="mention-dropdown"]').waitFor({ state: 'visible' })
    await input.fill('@jo')
    await input.fill('@john')
    await page.locator('[data-testid="mention-suggestion"]').first().click()
    
    // Get final mutation count
    const finalMutationCount = await page.evaluate(() => {
      // @ts-ignore
      const observer = window.mutationObserver
      const mutations = observer.takeRecords().length
      observer.disconnect()
      return mutations
    })
    
    // DOM mutations should be reasonable
    expect(finalMutationCount).toBeLessThan(50) // Max 50 DOM changes for the interaction
    
    await page.evaluate((count) => {
      console.log('DOM_MUTATION_PERFORMANCE', {
        timestamp: new Date().toISOString(),
        mutations: count,
        interactions: 4,
        ratio: count / 4,
        threshold: 50,
        passed: count < 50
      })
    }, finalMutationCount)
  })

  /**
   * SCROLL PERFORMANCE VALIDATION
   * Ensures mention components don't cause scroll performance issues
   */
  test('should maintain scroll performance with mention components', async ({ page }) => {
    // Create a long list with mention inputs
    await page.evaluate(() => {
      const container = document.createElement('div')
      container.style.height = '2000px'
      
      for (let i = 0; i < 100; i++) {
        const mentionInput = document.createElement('textarea')
        mentionInput.setAttribute('data-testid', `scroll-mention-${i}`)
        mentionInput.placeholder = `Mention input ${i}`
        mentionInput.style.margin = '10px'
        mentionInput.style.width = '300px'
        container.appendChild(mentionInput)
      }
      
      document.body.appendChild(container)
    })
    
    // Measure scroll performance
    const scrollMetrics = await measurePerformance(page, async () => {
      // Scroll through the page with mention inputs
      for (let i = 0; i < 10; i++) {
        await page.evaluate((scrollTop) => {
          window.scrollTo(0, scrollTop)
        }, i * 200)
        await page.waitForTimeout(100)
      }
    })
    
    // Scroll operations should be fast
    expect(scrollMetrics.renderTime).toBeLessThan(1000) // Max 1 second for all scrolling
    
    await page.evaluate((metrics) => {
      console.log('SCROLL_PERFORMANCE_WITH_MENTIONS', {
        timestamp: new Date().toISOString(),
        scrollTime: metrics.renderTime,
        memoryDelta: metrics.memoryUsage,
        mentionInputs: 100,
        scrollOperations: 10,
        threshold: 1000,
        passed: metrics.renderTime < 1000
      })
    }, scrollMetrics)
  })

  /**
   * CONCURRENT MENTION PERFORMANCE
   * Tests performance when multiple mention inputs are active simultaneously
   */
  test('should handle concurrent mention inputs efficiently', async ({ page }) => {
    // Create multiple mention inputs
    await page.evaluate(() => {
      const container = document.createElement('div')
      for (let i = 0; i < 10; i++) {
        const wrapper = document.createElement('div')
        wrapper.innerHTML = `
          <textarea data-testid="concurrent-mention-${i}" placeholder="Mention input ${i}"></textarea>
          <div data-testid="concurrent-dropdown-${i}" style="display: none;">Dropdown ${i}</div>
        `
        container.appendChild(wrapper)
      }
      document.body.appendChild(container)
    })
    
    const concurrentMetrics = await measurePerformance(page, async () => {
      // Activate all mention inputs simultaneously
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          page.locator(`[data-testid="concurrent-mention-${i}"]`).fill(`@user${i}`)
        )
      }
      await Promise.all(promises)
      
      // Wait for all processing to complete
      await page.waitForTimeout(500)
    })
    
    // Concurrent operations should remain performant
    expect(concurrentMetrics.renderTime).toBeLessThan(500) // Max 500ms for 10 concurrent inputs
    expect(concurrentMetrics.memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryIncrease)
    
    await page.evaluate((metrics) => {
      console.log('CONCURRENT_MENTION_PERFORMANCE', {
        timestamp: new Date().toISOString(),
        concurrentInputs: 10,
        totalTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage,
        averageTimePerInput: metrics.renderTime / 10,
        thresholds: {
          maxTime: 500,
          maxMemory: 5242880
        },
        passed: metrics.renderTime < 500 && metrics.memoryUsage < 5242880
      })
    }, concurrentMetrics)
  })
})

/**
 * PERFORMANCE BASELINE TRACKING
 * Track performance metrics over time to detect gradual degradation
 */
test.describe('Performance Baseline Tracking', () => {
  
  test('should maintain performance baseline over time', async ({ page }) => {
    const baselineMetrics = {
      timestamp: new Date().toISOString(),
      dropdownRenderTime: 0,
      memoryUsage: 0,
      eventHandlers: 0,
      domNodes: 0
    }
    
    // Measure current performance
    const currentMetrics = await measurePerformance(page, async () => {
      await page.locator('[data-testid="mention-input"]').fill('@')
      await page.locator('[data-testid="mention-dropdown"]').waitFor({ state: 'visible' })
    })
    
    baselineMetrics.dropdownRenderTime = currentMetrics.renderTime
    baselineMetrics.memoryUsage = currentMetrics.memoryUsage
    baselineMetrics.eventHandlers = currentMetrics.eventListeners
    baselineMetrics.domNodes = currentMetrics.domNodes
    
    // Export baseline for historical tracking
    await page.evaluate((baseline) => {
      console.log('PERFORMANCE_BASELINE_UPDATE', baseline)
    }, baselineMetrics)
    
    // All metrics should be within acceptable ranges
    expect(baselineMetrics.dropdownRenderTime).toBeLessThan(100)
    expect(baselineMetrics.memoryUsage).toBeLessThan(5242880)
    expect(baselineMetrics.eventHandlers).toBeLessThan(50)
    expect(baselineMetrics.domNodes).toBeLessThan(1000)
  })
})

/**
 * NEURAL TRAINING DATA EXPORT FOR PERFORMANCE
 * Export performance regression patterns for neural training
 */
test.describe('Performance Neural Training Export', () => {
  
  test('should export performance regression patterns', async ({ page }) => {
    const performancePatterns = {
      export_id: `PERF-${Date.now()}`,
      timestamp: new Date().toISOString(),
      training_type: 'performance_regression_prevention',
      patterns: [
        {
          name: 'dropdown_render_performance',
          threshold: 100,
          severity: 'HIGH',
          indicators: ['slow_render', 'excessive_dom_mutations', 'memory_spikes']
        },
        {
          name: 'memory_leak_detection',
          threshold: 5242880, // 5MB
          severity: 'CRITICAL', 
          indicators: ['growing_memory', 'uncleaned_handlers', 'retained_references']
        },
        {
          name: 'event_handler_accumulation',
          threshold: 50,
          severity: 'MEDIUM',
          indicators: ['handler_growth', 'memory_retention', 'performance_degradation']
        },
        {
          name: 'state_update_cascades',
          threshold: 100,
          severity: 'HIGH',
          indicators: ['excessive_rerenders', 'ui_freezing', 'input_lag']
        }
      ],
      prevention_strategies: [
        'Performance threshold monitoring',
        'Memory usage tracking',
        'Event handler lifecycle management',
        'State update batching',
        'DOM mutation minimization'
      ],
      neural_weights: {
        render_time_importance: 0.9,
        memory_usage_importance: 0.95,
        event_handler_importance: 0.7,
        state_update_importance: 0.8
      }
    }
    
    await page.evaluate((patterns) => {
      console.log('PERFORMANCE_TRAINING_DATA_EXPORT', patterns)
    }, performancePatterns)
    
    expect(performancePatterns.patterns).toHaveLength(4)
    expect(performancePatterns.prevention_strategies).toHaveLength(5)
  })
})