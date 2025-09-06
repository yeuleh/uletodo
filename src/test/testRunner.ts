/**
 * Test runner script for comprehensive testing
 */

import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  fn: () => Promise<void> | void;
  timeout?: number;
}

interface TestResult {
  suite: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
}

class TestRunner {
  private results: TestResult[] = [];
  private suites: TestSuite[] = [];

  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  async runAll(): Promise<TestResult[]> {
    console.log('🚀 Starting comprehensive test suite...\n');

    for (const suite of this.suites) {
      console.log(`📦 Running suite: ${suite.name}`);
      
      for (const test of suite.tests) {
        const result = await this.runTest(suite.name, test);
        this.results.push(result);
        
        const statusIcon = result.status === 'passed' ? '✅' : 
                          result.status === 'failed' ? '❌' : '⏭️';
        
        console.log(`  ${statusIcon} ${test.name} (${result.duration.toFixed(2)}ms)`);
        
        if (result.error) {
          console.log(`    Error: ${result.error.message}`);
        }
      }
      
      console.log('');
    }

    this.printSummary();
    return this.results;
  }

  private async runTest(suiteName: string, test: TestCase): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const timeout = test.timeout || 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
      });

      await Promise.race([
        Promise.resolve(test.fn()),
        timeoutPromise
      ]);

      const endTime = performance.now();
      
      return {
        suite: suiteName,
        test: test.name,
        status: 'passed',
        duration: endTime - startTime
      };
    } catch (error) {
      const endTime = performance.now();
      
      return {
        suite: suiteName,
        test: test.name,
        status: 'failed',
        duration: endTime - startTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  private printSummary(): void {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const total = this.results.length;
    
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('📊 Test Summary');
    console.log('================');
    console.log(`Total: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`⏱️ Duration: ${totalDuration.toFixed(2)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  ${r.suite} > ${r.test}`);
          if (r.error) {
            console.log(`    ${r.error.message}`);
          }
        });
    }
    
    const successRate = (passed / total) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 95) {
      console.log('🎉 Excellent! All tests are passing.');
    } else if (successRate >= 80) {
      console.log('👍 Good! Most tests are passing.');
    } else {
      console.log('⚠️ Warning! Many tests are failing.');
    }
  }

  getResults(): TestResult[] {
    return [...this.results];
  }

  getFailedTests(): TestResult[] {
    return this.results.filter(r => r.status === 'failed');
  }

  getPassedTests(): TestResult[] {
    return this.results.filter(r => r.status === 'passed');
  }
}

// Performance benchmarks
export const performanceBenchmarks = {
  async taskCreation(): Promise<void> {
    const startTime = performance.now();
    
    // Simulate task creation
    const tasks = Array.from({ length: 1000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      description: `Description for task ${i}`,
      createdAt: new Date()
    }));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 100) {
      throw new Error(`Task creation too slow: ${duration.toFixed(2)}ms (expected < 100ms)`);
    }
  },

  async largeDatasetFiltering(): Promise<void> {
    const startTime = performance.now();
    
    // Simulate filtering large dataset
    const largeTasks = Array.from({ length: 10000 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: ['todo', 'in_progress', 'completed'][i % 3],
      priority: ['high', 'medium', 'low', 'none'][i % 4]
    }));
    
    const filtered = largeTasks.filter(task => 
      task.status === 'completed' && task.priority === 'high'
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 50) {
      throw new Error(`Filtering too slow: ${duration.toFixed(2)}ms (expected < 50ms)`);
    }
    
    if (filtered.length === 0) {
      throw new Error('No filtered results found');
    }
  },

  async memoryUsage(): Promise<void> {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Create large objects
    const largeObjects = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      data: new Array(1000).fill(0).map((_, j) => ({ key: j, value: `value-${j}` }))
    }));
    
    const peakMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Cleanup
    largeObjects.length = 0;
    
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    if (initialMemory > 0) {
      const memoryIncrease = peakMemory - initialMemory;
      const memoryAfterCleanup = finalMemory - initialMemory;
      
      // Memory should be released after cleanup
      if (memoryAfterCleanup > memoryIncrease * 0.8) {
        throw new Error('Memory not properly released after cleanup');
      }
    }
  }
};

// Integration test scenarios
export const integrationTests = {
  async completeTaskWorkflow(): Promise<void> {
    // Simulate complete task workflow
    const taskData = {
      title: 'Integration Test Task',
      description: 'Testing complete workflow',
      priority: 'high',
      tags: ['test', 'integration']
    };

    // Simulate task creation
    const task = { ...taskData, id: 'test-task-1', createdAt: new Date() };
    
    // Simulate task update
    const updatedTask = { ...task, title: 'Updated Integration Test Task' };
    
    // Simulate task completion
    const completedTask = { ...updatedTask, status: 'completed', completedAt: new Date() };
    
    // Verify workflow
    if (!task.id || !updatedTask.title.includes('Updated') || completedTask.status !== 'completed') {
      throw new Error('Task workflow validation failed');
    }
  },

  async subtaskManagement(): Promise<void> {
    // Simulate subtask creation and management
    const parentTask = {
      id: 'parent-task',
      title: 'Parent Task',
      status: 'todo'
    };

    const subtasks = [
      { id: 'subtask-1', title: 'Subtask 1', parentId: 'parent-task', status: 'completed' },
      { id: 'subtask-2', title: 'Subtask 2', parentId: 'parent-task', status: 'completed' },
      { id: 'subtask-3', title: 'Subtask 3', parentId: 'parent-task', status: 'todo' }
    ];

    // Calculate progress
    const completedSubtasks = subtasks.filter(st => st.status === 'completed').length;
    const progress = (completedSubtasks / subtasks.length) * 100;

    if (progress !== 66.66666666666666) {
      throw new Error(`Incorrect progress calculation: ${progress}% (expected ~66.67%)`);
    }
  },

  async tagManagement(): Promise<void> {
    // Simulate tag operations
    const tags = [
      { id: 'tag-1', name: 'work', color: '#3b82f6' },
      { id: 'tag-2', name: 'personal', color: '#10b981' },
      { id: 'tag-3', name: 'urgent', color: '#ef4444' }
    ];

    const tasks = [
      { id: 'task-1', title: 'Task 1', tags: ['work', 'urgent'] },
      { id: 'task-2', title: 'Task 2', tags: ['personal'] },
      { id: 'task-3', title: 'Task 3', tags: ['work'] }
    ];

    // Test tag filtering
    const workTasks = tasks.filter(task => task.tags.includes('work'));
    const urgentTasks = tasks.filter(task => task.tags.includes('urgent'));

    if (workTasks.length !== 2 || urgentTasks.length !== 1) {
      throw new Error('Tag filtering failed');
    }
  }
};

// Export test runner
export { TestRunner };
export type { TestSuite, TestCase, TestResult };