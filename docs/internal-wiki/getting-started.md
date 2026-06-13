# Clarity AI — Getting Started

## What is Clarity?

Clarity is an AI-powered desktop overlay that helps you navigate and understand anything on your screen. It listens to your questions, takes a screenshot for context, and guides you with cursor highlights and step-by-step instructions.

## Starting Clarity

1. Launch the app (electron .)
2. The chat window appears — type your question or click the microphone icon to speak
3. Clarity captures your screen and responds with visual guidance

## Asking questions

- **Navigation help**: "Show me where to insert a table in Google Docs"
- **Step-by-step guidance**: "Walk me through creating a Figma component"
- **General Q&A**: "What does a pivot table do?"
- **Screen context**: "What app is open and what is on screen?"

## Using the hybrid loop (multi-step guidance)

1. Clarity highlights the first UI element on screen
2. A **Next** button appears — click it when you've completed that step
3. Clarity re-captures your screen and shows the next action
4. When done, click **Cancel** or wait for the loop to finish

## Voice input

- Click the **microphone icon** to start recording
- Speak clearly — recording stops automatically after 2 seconds of silence
- The transcript appears in the chat input; press Enter to send

## File attachments

- Click the **paperclip icon** to attach a file
- Supported: images, PDFs, text files, code files
- Up to 5 attachments per message

## Knowledge base (RAG)

- Clarity uses a local knowledge base of how-to guides to give recipe-grounded answers
- Run `node scripts/ingest-docs.js` to index documents in the `docs/` folder
- Add your own `.md` or `.txt` files to `docs/` subdirectories and re-run ingest
- Status: check via the Dashboard or the `rag:status` IPC channel

## Commands

| Command | Effect |
|---------|--------|
| /cursor X Y label | Move AI cursor to coordinates |
| /highlight X Y W H | Draw highlight box |
| /clear | Remove all highlights |
| /cancel | Cancel active guided prompt |
| /screens | List available screen sources |
