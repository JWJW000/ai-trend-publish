import db from "@src/db/db.ts";
import { publishedArticles } from "@src/db/schema.ts";
import { desc } from "drizzle-orm/expressions";

export interface ArticleLogInput {
  title: string;
  summary?: string;
  workflowType?: string;
  platform: string;
  url: string;
  publishedAt?: Date;
}

export class ArticleLogService {
  static async logPublishedArticle(input: ArticleLogInput): Promise<void> {
    // 将 Date 对象转换为 MySQL 兼容的格式 (YYYY-MM-DD HH:MM:SS)
    let publishedAtValue: string | undefined = undefined;
    if (input.publishedAt) {
      const date = input.publishedAt;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      publishedAtValue = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    
    await db.insert(publishedArticles).values({
      title: input.title,
      summary: input.summary ?? null,
      workflowType: input.workflowType ?? null,
      platform: input.platform,
      url: input.url,
      publishedAt: publishedAtValue,
    });
  }

  static async getRecentArticles(limit = 20) {
    const rows = await db
      .select()
      .from(publishedArticles)
      .orderBy(desc(publishedArticles.publishedAt))
      .limit(limit);

    return rows;
  }
}

