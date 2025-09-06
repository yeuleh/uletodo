import React, { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  DatePicker,
  TimePicker,
  PrioritySelector,
  TagSelector,
  ConfirmDialog,
  LoadingSpinner,
  ErrorMessage,
} from './common';
import { TaskForm } from './task';
import { TaskFilterDemo } from './demo/TaskFilterDemo';
import { AdvancedFilteringDemo } from './demo/AdvancedFilteringDemo';
import { TaskPriority, Tag, CreateTaskInput, UpdateTaskInput } from '@/types';
import './ComponentPreview.css';

export const ComponentPreview: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dateValue, setDateValue] = useState<Date | null>(null);
  const [timeValue, setTimeValue] = useState<number | null>(null);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NONE);
  const [selectedTags, setSelectedTags] = useState<string[]>(['工作', '重要']);
  const [loading, setLoading] = useState(false);

  // Mock tags data
  const mockTags: Tag[] = [
    { id: '1', name: '工作', color: '#3b82f6', createdAt: new Date(), usageCount: 15 },
    { id: '2', name: '重要', color: '#ef4444', createdAt: new Date(), usageCount: 8 },
    { id: '3', name: '个人', color: '#10b981', createdAt: new Date(), usageCount: 12 },
    { id: '4', name: '学习', color: '#f59e0b', createdAt: new Date(), usageCount: 6 },
    { id: '5', name: '项目', color: '#8b5cf6', createdAt: new Date(), usageCount: 20 },
  ];

  const handleCreateTag = async (tagName: string): Promise<Tag> => {
    // Mock tag creation
    return {
      id: Date.now().toString(),
      name: tagName,
      color: '#646cff',
      createdAt: new Date(),
      usageCount: 0,
    };
  };

  const handleTaskSave = async (taskData: CreateTaskInput | UpdateTaskInput) => {
    setLoading(true);
    // Mock save delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setShowTaskForm(false);
    console.log('Task saved:', taskData);
  };

  const handleConfirmAction = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setShowConfirm(false);
  };

  return (
    <div className="component-preview">
      <header className="preview-header">
        <h1>uletodo - UI组件预览</h1>
        <p>这里展示了我们刚刚实现的所有核心UI组件</p>
      </header>

      <div className="preview-sections">
        {/* Buttons Section */}
        <section className="preview-section">
          <h2>按钮组件 (Button)</h2>
          <div className="component-grid">
            <Button variant="primary">主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="danger">危险按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="primary" size="small">小按钮</Button>
            <Button variant="primary" size="large">大按钮</Button>
            <Button variant="primary" loading>加载中...</Button>
            <Button variant="primary" disabled>禁用状态</Button>
          </div>
        </section>

        {/* Input Section */}
        <section className="preview-section">
          <h2>输入框组件 (Input)</h2>
          <div className="input-grid">
            <Input
              label="标准输入框"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="请输入内容..."
            />
            <Input
              label="带错误的输入框"
              value=""
              error="这是一个错误信息"
              placeholder="错误状态"
            />
            <Input
              label="带帮助文本的输入框"
              value=""
              helperText="这是帮助文本"
              placeholder="带帮助文本"
            />
            <Input
              label="禁用的输入框"
              value="禁用状态"
              disabled
            />
          </div>
        </section>

        {/* Date and Time Pickers */}
        <section className="preview-section">
          <h2>日期时间选择器</h2>
          <div className="picker-grid">
            <DatePicker
              label="日期选择器"
              value={dateValue}
              onChange={setDateValue}
            />
            <DatePicker
              label="日期时间选择器"
              value={dateValue}
              onChange={setDateValue}
              showTime
            />
            <TimePicker
              label="时间选择器"
              value={timeValue}
              onChange={setTimeValue}
            />
          </div>
        </section>

        {/* Priority Selector */}
        <section className="preview-section">
          <h2>优先级选择器 (PrioritySelector)</h2>
          <div className="priority-grid">
            <PrioritySelector
              label="任务优先级"
              value={priority}
              onChange={setPriority}
            />
            <div className="priority-display">
              当前选择: <strong>{priority}</strong>
            </div>
          </div>
        </section>

        {/* Tag Selector */}
        <section className="preview-section">
          <h2>标签选择器 (TagSelector)</h2>
          <TagSelector
            label="任务标签"
            selectedTags={selectedTags}
            availableTags={mockTags}
            onTagsChange={setSelectedTags}
            onCreateTag={handleCreateTag}
            placeholder="添加标签..."
            maxTags={5}
          />
        </section>

        {/* Loading and Error States */}
        <section className="preview-section">
          <h2>加载和错误状态</h2>
          <div className="state-grid">
            <div className="state-item">
              <h3>加载指示器</h3>
              <div className="spinner-row">
                <LoadingSpinner size="small" />
                <LoadingSpinner size="medium" />
                <LoadingSpinner size="large" />
              </div>
            </div>
            <div className="state-item">
              <h3>错误消息</h3>
              <ErrorMessage
                variant="error"
                title="操作失败"
                message="无法保存任务，请检查网络连接后重试。"
                onRetry={() => console.log('重试')}
                onDismiss={() => console.log('关闭')}
              />
            </div>
            <div className="state-item">
              <ErrorMessage
                variant="warning"
                message="这是一个警告消息，请注意。"
              />
            </div>
          </div>
        </section>

        {/* Task Filter Demo */}
        <section className="preview-section">
          <h2>任务过滤器演示 (TaskFilter)</h2>
          <TaskFilterDemo />
        </section>

        {/* Advanced Filtering Demo */}
        <section className="preview-section">
          <h2>高级过滤演示 (Advanced Filtering)</h2>
          <AdvancedFilteringDemo />
        </section>

        {/* Interactive Demos */}
        <section className="preview-section">
          <h2>交互演示</h2>
          <div className="demo-grid">
            <Button variant="primary" onClick={() => setShowModal(true)}>
              打开模态框
            </Button>
            <Button variant="danger" onClick={() => setShowConfirm(true)}>
              显示确认对话框
            </Button>
            <Button variant="secondary" onClick={() => setShowTaskForm(true)}>
              打开任务表单
            </Button>
          </div>
        </section>
      </div>

      {/* Modal Demo */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="模态框演示"
        size="medium"
      >
        <div style={{ padding: '1rem 0' }}>
          <p>这是一个模态框的内容区域。</p>
          <p>你可以在这里放置任何内容，比如表单、信息展示等。</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={() => setShowModal(false)}>
              确定
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog Demo */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmAction}
        title="确认删除"
        message="你确定要删除这个任务吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={loading}
      />

      {/* Task Form Demo */}
      <Modal
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        title="创建新任务"
        size="large"
      >
        <TaskForm
          onSave={handleTaskSave}
          onCancel={() => setShowTaskForm(false)}
          availableTags={mockTags}
          onCreateTag={handleCreateTag}
          loading={loading}
        />
      </Modal>
    </div>
  );
};