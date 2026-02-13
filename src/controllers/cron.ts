import cron from "npm:node-cron";
import { WeixinArticleWorkflow } from "@src/services/weixin-article.workflow.ts";
import { BarkNotifier } from "@src/modules/notify/bark.notify.ts";
import { WorkflowEntrypoint } from "@src/works/workflow.ts";
import { WorkflowConfigService } from "@src/services/workflow-config.service.ts";
import { Logger } from "@zilla/logger";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
const logger = new Logger("cron");
export enum WorkflowType {
  WeixinArticle = "weixin-article-workflow",
}

export function getWorkflow(type: WorkflowType): WorkflowEntrypoint {
  switch (type) {
    case WorkflowType.WeixinArticle:
      return new WeixinArticleWorkflow({
        id: "weixin-article-workflow",
        env: {
          name: "weixin-article-workflow",
        },
      });
    default:
      throw new Error(`未知的工作流类型: ${type}`);
  }
}

export const startCronJobs = async () => {
  const barkNotifier = new BarkNotifier();
  barkNotifier.notify("定时任务启动", "定时任务启动");
  logger.info("初始化定时任务...");

  // 从配置获取 Cron 表达式，默认每天凌晨 3 点
  let cronExpression = "0 3 * * *";
  try {
    const configManager = ConfigManager.getInstance();
    cronExpression = await configManager.get<string>("CRON_EXPRESSION") ||
      cronExpression;
  } catch {
    // 保持默认
  }

  logger.info(`使用 Cron 表达式: ${cronExpression}`);

  cron.schedule(
    cronExpression,
    async () => {
      const dayOfWeek = new Date().getDay(); // 0是周日，1-6是周一到周六
      const adjustedDay = dayOfWeek === 0
        ? 7
        : dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7; // 将周日的0转换为7

      try {
        const workflowConfigService = WorkflowConfigService.getInstance();
        const workflowType = await workflowConfigService.getDailyWorkflow(
          adjustedDay,
        );

        if (workflowType) {
          logger.info(`开始执行周${adjustedDay}的工作流: ${workflowType}...`);
          const workflow = getWorkflow(workflowType);
          await workflow.execute({
            payload: {},
            id: "cron-job",
            timestamp: Date.now(),
          });
        } else {
          logger.info(`周${adjustedDay}没有配置对应的工作流`);
        }
      } catch (error) {
        logger.error(`工作流执行失败:`, error);
        barkNotifier.notify("工作流执行失败", String(error));
      }
    },
    {
      timezone: "Asia/Shanghai",
    },
  );
};
