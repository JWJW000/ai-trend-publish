import { WorkflowType } from "@src/controllers/cron.ts";

export interface DailyWorkflowConfig {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1-7，表示周一到周日
  workflowType: WorkflowType;
  isEnabled: boolean;
}

export class WorkflowConfigService {
  private static instance: WorkflowConfigService;
  private constructor() {}

  public static getInstance(): WorkflowConfigService {
    if (!WorkflowConfigService.instance) {
      WorkflowConfigService.instance = new WorkflowConfigService();
    }
    return WorkflowConfigService.instance;
  }

  async getDailyWorkflow(
    _dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  ): Promise<WorkflowType | null> {
    // 现在仅保留微信文章工作流，始终返回 WeixinArticle
    return WorkflowType.WeixinArticle;
  }
}
