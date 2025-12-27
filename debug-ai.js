const { streamText } = require('ai');
const { openai } = require('@ai-sdk/openai');

async function inspectResult() {
    try {
        console.log('Calling streamText...');
        const result = streamText({
            model: openai('gpt-4o'),
            messages: [{ role: 'user', content: 'hello' }],
        });

        console.log('Result keys:', Object.keys(result));
        console.log('Has toDataStreamResponse?', typeof result.toDataStreamResponse);
        console.log('Has toTextStreamResponse?', typeof result.toTextStreamResponse);
        console.log('Has toDataStream?', typeof result.toDataStream);
    } catch (e) {
        console.error('Error:', e);
    }
}

inspectResult();
