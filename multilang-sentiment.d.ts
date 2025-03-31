// multilang-sentiment.d.ts
declare module 'multilang-sentiment' {
  export interface SentimentAnalysisResult {
    score: number;
    comparative: number;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  function sentiment(text: string, language?: string): SentimentAnalysisResult;

  export default sentiment;
}
