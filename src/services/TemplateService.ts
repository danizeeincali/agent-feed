import { PostTemplate, TemplateCategory, TemplateContext, TemplateSuggestion } from '@/types/templates';

export class TemplateService {
  private static instance: TemplateService;
  private templates: PostTemplate[] = [];
  private customTemplates: PostTemplate[] = [];

  private constructor() {
    this.initializeDefaultTemplates();
  }

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  private initializeDefaultTemplates() {
    this.templates = [
      // Original templates (enhanced)
      {
        id: 'status-update',
        name: 'Status Update',
        title: 'Weekly Progress Report',
        hook: 'Key achievements and upcoming priorities',
        content: `## 🎯 Completed This Week
- 

## 📋 Upcoming Priorities
- 

## 🚧 Blockers & Support Needed
- 

## 📊 Key Metrics
- `,
        tags: ['status', 'weekly', 'progress'],
        category: TemplateCategory.UPDATE,
        description: 'Share weekly progress and upcoming priorities',
        icon: '📊',
        color: 'blue',
        estimatedTime: 5,
        popularity: 95,
        metadata: {
          businessImpact: 8,
          targetAudience: ['team', 'managers', 'stakeholders'],
          bestTimeToUse: ['friday-afternoon', 'monday-morning'],
          contentStructure: ['achievements', 'priorities', 'blockers', 'metrics']
        }
      },
      {
        id: 'insight-share',
        name: 'Insight Share',
        title: 'Key Insight: ',
        hook: 'Important finding that could impact our strategy',
        content: `## 💡 The Insight


## 🎯 Why It Matters


## 🚀 Recommended Actions
- 
- 
- 

## 📈 Expected Impact
`,
        tags: ['insight', 'strategy', 'analysis'],
        category: TemplateCategory.INSIGHT,
        description: 'Share important insights and strategic findings',
        icon: '💡',
        color: 'yellow',
        estimatedTime: 8,
        popularity: 87,
        metadata: {
          businessImpact: 9,
          targetAudience: ['leadership', 'strategy-team'],
          bestTimeToUse: ['tuesday', 'wednesday'],
          contentStructure: ['insight', 'impact', 'actions', 'metrics']
        }
      },
      {
        id: 'question-ask',
        name: 'Question/Ask',
        title: 'Need Input: ',
        hook: 'Looking for team input on an important decision',
        content: `## ❓ The Question


## 📋 Background Context


## 🔍 Options Being Considered
1. **Option A**: 
2. **Option B**: 
3. **Option C**: 

## ⏰ Timeline for Decision
- Decision needed by: 
- Implementation target: 

## 🙏 What I Need From You
- `,
        tags: ['question', 'input-needed', 'decision'],
        category: TemplateCategory.QUESTION,
        description: 'Ask for team input on important decisions',
        icon: '❓',
        color: 'purple',
        estimatedTime: 6,
        popularity: 82
      },
      {
        id: 'announcement',
        name: 'Announcement',
        title: 'Important Update: ',
        hook: 'Significant change or update that affects the team',
        content: `## 📢 What's Changing


## 🤔 Why This Change


## 👥 Impact on You
- 
- 

## 📅 Next Steps
- [ ] 
- [ ] 
- [ ] 

## 💬 Questions & Support
Feel free to reach out if you have any questions!`,
        tags: ['announcement', 'update', 'change'],
        category: TemplateCategory.ANNOUNCEMENT,
        description: 'Announce important changes or updates',
        icon: '📢',
        color: 'red',
        estimatedTime: 7,
        popularity: 78
      },
      
      // New specialized templates
      {
        id: 'code-review-request',
        name: 'Code Review Request',
        title: 'Code Review Needed: ',
        hook: 'Looking for feedback on recent implementation',
        content: `## 🔍 Review Request

**Pull Request**: [Link to PR]
**Feature/Fix**: 

## 📝 What Changed
- 
- 
- 

## 🎯 Areas of Focus
Please pay special attention to:
- [ ] Performance implications
- [ ] Security considerations  
- [ ] Code structure and readability
- [ ] Test coverage

## ⏰ Timeline
- Deadline for review: 
- Expected merge: 

## 🤝 Reviewers Needed
@mention-reviewers-here`,
        tags: ['code-review', 'development', 'feedback'],
        category: TemplateCategory.CODE_REVIEW,
        description: 'Request code reviews from team members',
        icon: '🔍',
        color: 'green',
        estimatedTime: 4,
        popularity: 72
      },
      {
        id: 'meeting-summary',
        name: 'Meeting Summary',
        title: 'Meeting Notes: ',
        hook: 'Key takeaways and action items from our discussion',
        content: `## 📅 Meeting Details
- **Date**: 
- **Duration**: 
- **Attendees**: 

## 🎯 Key Decisions
- 
- 

## 📋 Action Items
- [ ] **[Owner]**: 
- [ ] **[Owner]**: 
- [ ] **[Owner]**: 

## 💬 Discussion Highlights
- 
- 

## 📅 Next Steps
- Next meeting: 
- Follow-up required: `,
        tags: ['meeting', 'summary', 'action-items'],
        category: TemplateCategory.MEETING_SUMMARY,
        description: 'Summarize meetings with clear action items',
        icon: '📝',
        color: 'indigo',
        estimatedTime: 10,
        popularity: 85
      },
      {
        id: 'goal-setting',
        name: 'Goal Setting',
        title: 'Goal Setting: ',
        hook: 'Defining clear objectives and success metrics',
        content: `## 🎯 Goal Statement


## 📊 Success Metrics
- **Primary Metric**: 
- **Secondary Metrics**: 
  - 
  - 

## 📅 Timeline
- **Start Date**: 
- **Target Completion**: 
- **Key Milestones**:
  - [ ] Milestone 1 (Date)
  - [ ] Milestone 2 (Date)
  - [ ] Milestone 3 (Date)

## 🚀 Action Plan
1. 
2. 
3. 

## 🤝 Support Needed
- Resources: 
- Team members: 
- Dependencies: `,
        tags: ['goals', 'planning', 'objectives'],
        category: TemplateCategory.GOAL_SETTING,
        description: 'Set clear goals with metrics and timelines',
        icon: '🎯',
        color: 'emerald',
        estimatedTime: 12,
        popularity: 70
      },
      {
        id: 'problem-solving',
        name: 'Problem Solving',
        title: 'Problem Analysis: ',
        hook: 'Breaking down a challenge and exploring solutions',
        content: `## 🚨 Problem Statement


## 📊 Current Situation
- **Impact**: 
- **Affected Areas**: 
- **Urgency Level**: 

## 🔍 Root Cause Analysis
- Primary causes:
  - 
  - 
- Contributing factors:
  - 
  - 

## 💡 Proposed Solutions
1. **Solution A** (Effort: Low/Med/High)
   - Pros: 
   - Cons: 
   
2. **Solution B** (Effort: Low/Med/High)
   - Pros: 
   - Cons: 

## 🎯 Recommended Approach
- **Solution**: 
- **Timeline**: 
- **Resources needed**: 
- **Success criteria**: `,
        tags: ['problem-solving', 'analysis', 'solution'],
        category: TemplateCategory.PROBLEM_SOLVING,
        description: 'Analyze problems and propose solutions',
        icon: '🔧',
        color: 'orange',
        estimatedTime: 15,
        popularity: 68
      },
      {
        id: 'celebration',
        name: 'Celebration',
        title: '🎉 Celebrating: ',
        hook: 'Recognizing achievements and milestones',
        content: `## 🎊 What We're Celebrating


## 👏 Recognition
Huge thanks to everyone who made this possible:
- 
- 
- 

## 📈 Impact Achieved
- 
- 
- 

## 📚 Lessons Learned
- What worked well: 
- What we'd do differently: 
- Key insights: 

## 🚀 Looking Forward
This success positions us well for:
- 
- `,
        tags: ['celebration', 'achievement', 'recognition'],
        category: TemplateCategory.CELEBRATION,
        description: 'Celebrate achievements and recognize contributions',
        icon: '🎉',
        color: 'pink',
        estimatedTime: 5,
        popularity: 75
      },
      {
        id: 'help-request',
        name: 'Request Help',
        title: 'Help Needed: ',
        hook: 'Looking for assistance with a challenge',
        content: `## 🆘 What I Need Help With


## 📋 Context & Background


## 🎯 Specific Areas Where I'm Stuck
- 
- 
- 

## 💡 What I've Tried
- ✅ 
- ✅ 
- ❌ 

## ⏰ Timeline
- **Urgency**: 
- **Ideal response time**: 
- **Deadline**: 

## 🤝 How You Can Help
- [ ] Brainstorm solutions
- [ ] Review my approach  
- [ ] Share relevant experience
- [ ] Connect me with experts
- [ ] Other: `,
        tags: ['help', 'assistance', 'support'],
        category: TemplateCategory.REQUEST_HELP,
        description: 'Request help and support from team members',
        icon: '🆘',
        color: 'red',
        estimatedTime: 6,
        popularity: 79
      },
      {
        id: 'brainstorm-session',
        name: 'Brainstorm Session',
        title: 'Brainstorm: ',
        hook: 'Let\'s explore creative solutions together',
        content: `## 🧠 Brainstorming Challenge


## 🎯 What We're Trying to Achieve


## 📋 Current Constraints
- Budget: 
- Timeline: 
- Resources: 
- Technical limitations: 

## 💭 Initial Ideas
- Idea 1: 
- Idea 2: 
- Idea 3: 

## 🚀 Wild Ideas Welcome!
No idea is too crazy - let's think outside the box!

## 🤝 How to Contribute
- Comment with your ideas
- Build on others' suggestions  
- Ask clarifying questions
- Share relevant examples

## ⏰ Timeline
- Brainstorming until: 
- Decision by: `,
        tags: ['brainstorm', 'creativity', 'ideation'],
        category: TemplateCategory.BRAINSTORM,
        description: 'Facilitate creative brainstorming sessions',
        icon: '🧠',
        color: 'violet',
        estimatedTime: 7,
        popularity: 65
      },
      {
        id: 'decision-record',
        name: 'Decision Record',
        title: 'Decision: ',
        hook: 'Documenting an important decision for future reference',
        content: `## ⚖️ Decision


## 📅 Decision Date
Date: 

## 👥 Decision Makers
- 
- 

## 📋 Context & Background


## 🔍 Options Considered
1. **Option A**: 
   - Pros: 
   - Cons: 
   
2. **Option B**: 
   - Pros: 
   - Cons: 

3. **Option C**: 
   - Pros: 
   - Cons: 

## 🎯 Decision Rationale
Why we chose this option:
- 
- 
- 

## 📊 Expected Outcomes
- 
- 
- 

## 📅 Review Date
We'll review this decision on: `,
        tags: ['decision', 'documentation', 'record'],
        category: TemplateCategory.DECISION,
        description: 'Document important decisions and rationale',
        icon: '⚖️',
        color: 'slate',
        estimatedTime: 10,
        popularity: 71
      },
      {
        id: 'learning-share',
        name: 'Learning Share',
        title: 'Learning: ',
        hook: 'Sharing knowledge and insights with the team',
        content: `## 📚 What I Learned


## 💡 Key Insights
- 
- 
- 

## 🛠️ How to Apply This
- **Immediate actions**: 
  - 
  - 
- **Long-term implications**: 
  - 
  - 

## 📖 Resources
- **Articles/Books**: 
- **Tools/Frameworks**: 
- **Experts to follow**: 

## 🤝 Discussion
- What's your experience with this?
- Any additional insights to share?
- Questions or clarifications?

## 🚀 Next Steps
How I plan to implement this learning:
- `,
        tags: ['learning', 'knowledge', 'insights'],
        category: TemplateCategory.LEARNING,
        description: 'Share learning and knowledge with the team',
        icon: '📚',
        color: 'teal',
        estimatedTime: 8,
        popularity: 74
      },
      {
        id: 'process-improvement',
        name: 'Process Improvement',
        title: 'Process Improvement: ',
        hook: 'Suggesting ways to work more effectively',
        content: `## 🔄 Current Process
**Process Name**: 
**Current State**: 

## 📊 Issues Identified
- **Pain Point 1**: 
  - Impact: 
  - Frequency: 
- **Pain Point 2**: 
  - Impact: 
  - Frequency: 

## 💡 Proposed Improvements
1. **Improvement 1**:
   - Description: 
   - Expected benefit: 
   - Effort required: 
   
2. **Improvement 2**:
   - Description: 
   - Expected benefit: 
   - Effort required: 

## 📈 Success Metrics
How we'll measure improvement:
- 
- 
- 

## 🚀 Implementation Plan
- [ ] Step 1: 
- [ ] Step 2: 
- [ ] Step 3: 

## 🤝 Feedback Welcome
What are your thoughts on these improvements?`,
        tags: ['process', 'improvement', 'efficiency'],
        category: TemplateCategory.PROCESS,
        description: 'Propose process improvements and optimizations',
        icon: '🔄',
        color: 'cyan',
        estimatedTime: 12,
        popularity: 69
      },
      {
        id: 'feedback-request',
        name: 'Feedback Request',
        title: 'Feedback Needed: ',
        hook: 'Seeking input to improve and grow',
        content: `## 🎯 What I Need Feedback On


## 📋 Context
**Project/Situation**: 
**My role**: 
**Timeline**: 

## 🔍 Specific Areas
Please focus feedback on:
- [ ] Overall approach
- [ ] Technical implementation  
- [ ] Communication style
- [ ] Decision making
- [ ] Other: 

## 💭 Guiding Questions
- What's working well?
- What could be improved?
- What would you do differently?
- Any blind spots I should be aware of?

## 🤝 How to Provide Feedback
- **Format**: (written, verbal, meeting)
- **Timeline**: 
- **Delivery preference**: (direct, sandwich method, etc.)

## 🙏 Thank You
I appreciate your time and honest feedback!`,
        tags: ['feedback', 'growth', 'improvement'],
        category: TemplateCategory.FEEDBACK,
        description: 'Request specific feedback for growth and improvement',
        icon: '💭',
        color: 'rose',
        estimatedTime: 6,
        popularity: 73
      }
    ];
  }

  getAllTemplates(): PostTemplate[] {
    return [...this.templates, ...this.customTemplates];
  }

  getTemplatesByCategory(category: TemplateCategory): PostTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  getPopularTemplates(limit: number = 5): PostTemplate[] {
    return this.getAllTemplates()
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }

  searchTemplates(query: string): PostTemplate[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTemplates().filter(template =>
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)) ||
      template.content.toLowerCase().includes(lowercaseQuery)
    );
  }

  suggestTemplates(context: TemplateContext): TemplateSuggestion[] {
    const suggestions: TemplateSuggestion[] = [];
    
    for (const template of this.getAllTemplates()) {
      let score = 0;
      let reason = '';
      
      // Time-based scoring
      if (context.timeOfDay) {
        const timePreferences = template.metadata?.bestTimeToUse || [];
        if (timePreferences.includes(context.timeOfDay) || 
            timePreferences.includes(`${context.dayOfWeek?.toLowerCase()}-${context.timeOfDay}`)) {
          score += 20;
          reason = `Great for ${context.timeOfDay} posts`;
        }
      }
      
      // Role-based scoring  
      if (context.userRole) {
        const audienceMatch = template.metadata?.targetAudience?.includes(context.userRole);
        if (audienceMatch) {
          score += 15;
          reason = reason ? `${reason}, matches your role` : `Perfect for ${context.userRole}`;
        }
      }
      
      // Recent activity scoring
      if (context.recentActivity?.length) {
        const hasRelevantActivity = context.recentActivity.some(activity =>
          template.tags.some(tag => activity.toLowerCase().includes(tag))
        );
        if (hasRelevantActivity) {
          score += 10;
          reason = reason ? `${reason}, relevant to recent activity` : 'Relevant to your recent activity';
        }
      }
      
      // Popularity bonus
      score += (template.popularity || 0) / 10;
      
      if (score > 0) {
        suggestions.push({
          template,
          score,
          reason: reason || 'Popular template',
          context
        });
      }
    }
    
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  createCustomTemplate(template: Omit<PostTemplate, 'id'>): PostTemplate {
    const customTemplate: PostTemplate = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isPublic: false,
      usageCount: 0,
      popularity: 0
    };
    
    this.customTemplates.push(customTemplate);
    return customTemplate;
  }

  updateTemplate(id: string, updates: Partial<PostTemplate>): PostTemplate | null {
    const templateIndex = this.customTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) return null;
    
    this.customTemplates[templateIndex] = { ...this.customTemplates[templateIndex], ...updates };
    return this.customTemplates[templateIndex];
  }

  deleteTemplate(id: string): boolean {
    const templateIndex = this.customTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) return false;
    
    this.customTemplates.splice(templateIndex, 1);
    return true;
  }

  incrementUsage(id: string): void {
    const allTemplates = [...this.templates, ...this.customTemplates];
    const template = allTemplates.find(t => t.id === id);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;
      // Update popularity based on usage
      template.popularity = Math.min(100, (template.popularity || 0) + 1);
    }
  }

  getTemplateById(id: string): PostTemplate | null {
    return this.getAllTemplates().find(t => t.id === id) || null;
  }

  exportTemplates(): PostTemplate[] {
    return this.customTemplates;
  }

  importTemplates(templates: PostTemplate[]): void {
    // Validate and add imported templates
    const validTemplates = templates.filter(template => 
      template.name && template.content && template.category
    );
    
    this.customTemplates.push(...validTemplates);
  }
}

export const templateService = TemplateService.getInstance();