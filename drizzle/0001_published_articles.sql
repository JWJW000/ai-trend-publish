CREATE TABLE IF NOT EXISTS `published_articles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(255) NOT NULL,
  `summary` text,
  `workflow_type` varchar(100),
  `published_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `platform` varchar(50) NOT NULL,
  `url` text NOT NULL,
  CONSTRAINT `published_articles_id` PRIMARY KEY(`id`)
);

