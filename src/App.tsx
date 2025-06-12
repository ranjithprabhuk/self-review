import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Select,
  TextInput,
  Slider,
  Button,
  Text,
  Group,
  Textarea,
  Box,
  ScrollArea,
  useMantineTheme,
} from '@mantine/core';

import { useForm } from '@mantine/form';
import { saveAs } from 'file-saver';
import { getAIResponse } from './ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

function App() {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);

  const form = useForm({
    initialValues: {
      ai: 'gemini',
      apiKey: '',
      temperature: 0.3,
      instructions: '',
      context: '',
      accomplishments: '',
      goals: '',
      questions_answers: '',
      userInput: '',
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setConversation([]);

    const systemPrompt = `You are an AI assistant helping to build a self-review for an Engineering Leadership role. Use strict SBI (Situation - Behavior - Impact) format for all responses. Do not synthesize any content not present in the input. Avoid repetition between answers; cross-reference accomplishments. Use leadership-appropriate, professional phrasing. Keep answers concise, measurable, factual, and fully backed by provided accomplishments. Strictly no assumptions or exaggerations.`;

    const userPrompt = `Instructions: ${values.instructions}\n\nContext: ${values.context}\n\nAccomplishments: ${values.accomplishments}\n\nPerformance Ratings and Questions:\n${values.questions_answers}\n\nGoals: ${values.goals}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const result = await getAIResponse(values.ai, values.apiKey, values.temperature, messages);

    const newConversation: Message[] = [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: result || 'No response from AI.' },
    ];
    setConversation(newConversation);
    setLoading(false);
  };

  const handleContinue = async () => {
    const { ai, apiKey, temperature, userInput } = form.values;
    if (!userInput.trim()) return;

    setLoading(true);

    const currentConversation: Message[] = [...conversation, { role: 'user', content: userInput }];
    setConversation(currentConversation);
    form.setFieldValue('userInput', '');

    const messagesForApi = currentConversation.map((m) => ({ ...m, role: m.role as 'user' | 'assistant' }));

    const result = await getAIResponse(ai, apiKey, temperature, messagesForApi);

    setConversation([...currentConversation, { role: 'assistant', content: result || 'No response from AI.' }]);
    setLoading(false);
  };

  const handleDownload = () => {
    const fullConversation = conversation.map((m) => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([fullConversation], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'self-review-conversation.txt');
  };

  return (
    <Container size="md" my="xl">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={1} ta="center" mb="xl">
          Self-Review AI Assistant
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Select
            label="Select AI"
            placeholder="Pick one"
            data={[
              { value: 'gemini', label: 'Gemini' },
              { value: 'openai', label: 'OpenAI' },
              { value: 'claude', label: 'Claude' },
            ]}
            {...form.getInputProps('ai')}
          />

          <TextInput
            label="API Key"
            placeholder="Enter your API key"
            mt="md"
            type="password"
            required
            {...form.getInputProps('apiKey')}
          />

          <Text mt="md">Temperature: {form.values.temperature.toFixed(1)}</Text>
          <Slider min={0} max={1} step={0.1} {...form.getInputProps('temperature')} />

          <Textarea
            label="Instructions"
            placeholder="e.g., Use SBI format"
            mt="md"
            {...form.getInputProps('instructions')}
          />
          <Textarea
            label="Context"
            placeholder="e.g., I am a Staff Engineer..."
            mt="md"
            {...form.getInputProps('context')}
          />
          <Textarea
            label="Accomplishments"
            placeholder="e.g., Delivered Live Apps migration..."
            mt="md"
            {...form.getInputProps('accomplishments')}
          />
          <Textarea
            label="Summary of Goals"
            placeholder="e.g., Goal1: Project R2PY..."
            mt="md"
            {...form.getInputProps('goals')}
          />
          <Textarea
            label="Performance Questions & Ratings"
            placeholder="e.g., Q1: Software Delivery (Rating 5)..."
            mt="md"
            {...form.getInputProps('questions_answers')}
          />

          <Group justify="flex-end" mt="xl">
            <Button type="submit" loading={loading} disabled={conversation.length > 0}>
              Generate Self-Review
            </Button>
          </Group>
        </form>

        {conversation.length > 0 && (
          <Box mt="xl">
            <ScrollArea style={{ height: 400 }} type="auto">
              {conversation.map((msg, index) => (
                <Box key={index} my="sm">
                  <Text fw={700}>{msg.role === 'user' ? 'You' : 'AI'}</Text>
                  <Box
                    p="sm"
                    style={{
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.dark[4]}`,
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    ) : (
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                    )}
                  </Box>
                </Box>
              ))}
            </ScrollArea>
            <Group justify="space-between" mt="md">
              <Button onClick={() => setConversation([])} color="red" variant="outline">
                Clear
              </Button>
              <Button onClick={handleDownload}>Download Conversation</Button>
            </Group>
          </Box>
        )}

        {conversation.length > 0 && (
          <Box mt="xl">
            <Textarea
              placeholder="Continue the conversation..."
              {...form.getInputProps('userInput')}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleContinue();
                }
              }}
            />
            <Group justify="flex-end" mt="md">
              <Button onClick={handleContinue} loading={loading}>
                Send
              </Button>
            </Group>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default App;
