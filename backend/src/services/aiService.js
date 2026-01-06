import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateDailyReflection(promptContent) {
  try {
    console.log('=== Daily Reflection Prompt ===');
    console.log(promptContent);
    console.log('===============================');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
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

export async function generateWeeklyInsight(promptContent) {
  try {
    console.log('=== Weekly Insight Prompt ===');
    console.log(promptContent);
    console.log('=============================');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1536,
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
