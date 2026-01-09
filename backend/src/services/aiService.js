import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization - API 키가 로드된 후 초기화
let anthropic = null;

function getAnthropicClient() {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export async function generateDailyReflection(promptContent) {
  try {
    console.log('=== Daily Reflection Prompt ===');
    console.log(promptContent);
    console.log('===============================');

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: promptContent
        }
      ],
      temperature: 0.7,
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error('AI 회고 생성에 실패했습니다: ' + error.message);
  }
}

export async function generateTaskRecommendations(promptContent) {
  try {
    console.log('=== Task Recommendation Prompt ===');
    console.log(promptContent);
    console.log('==================================');

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: promptContent
        }
      ],
      temperature: 0.7,
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error('AI 할일 추천 생성에 실패했습니다: ' + error.message);
  }
}

export async function generateWeeklyInsight(promptContent) {
  try {
    console.log('=== Weekly Insight Prompt ===');
    console.log(promptContent);
    console.log('=============================');

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: promptContent
        }
      ],
      temperature: 0.7,
    });

    return message.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error('AI 주간 인사이트 생성에 실패했습니다: ' + error.message);
  }
}
