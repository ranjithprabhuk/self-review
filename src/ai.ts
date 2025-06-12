import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export const getAIResponse = async (
  ai: string,
  apiKey: string,
  temperature: number,
  messages: Message[]
) => {
  try {
    switch (ai) {
      case 'gemini': {
        const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
        const conversationMessages = messages.filter(m => m.role !== 'system');

        if (systemPrompt && conversationMessages.length > 0 && conversationMessages[0].role === 'user') {
            conversationMessages[0].content = `${systemPrompt}\n\n${conversationMessages[0].content}`;
        }

        const history = conversationMessages.slice(0, -1).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));
        const lastMessage = conversationMessages[conversationMessages.length - 1];

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        return response.text();
      }

      case 'openai': {
        const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
        const chatCompletion = await openai.chat.completions.create({
          messages: messages.map(m => ({role: m.role, content: m.content})),
          model: 'gpt-4o',
          temperature,
        });
        return chatCompletion.choices[0].message.content;
      }

      case 'claude': {
        const anthropic = new Anthropic({ apiKey });
        const systemPrompt = messages.find(m => m.role === 'system')?.content;
        const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })) as Anthropic.MessageParam[];

        const msg = await anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 4096,
          temperature,
          system: systemPrompt,
          messages: userMessages,
        });
        
        const textBlock = msg.content.find(block => block.type === 'text');
        return textBlock ? textBlock.text : 'No text response from Claude.';
      }

      default:
        throw new Error('Invalid AI selected');
    }
  } catch (error: any) {
    console.error(`Error generating response from ${ai}:`, error);
    return `Error: ${error.message}`;
  }
};
