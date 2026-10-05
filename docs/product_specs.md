# OpenUI Agent Specifications

## Overview
OpenUI Agent is an AI generative UI platform built on Rails 8, ruby_llm, and local Ollama models.
The platform turns natural language queries into interactive UI components (cards, metrics, forms, tables) using OpenUI Lang DSL.

## Subscription Plans (pricing tiers and features)
- **Starter Plan**: Free, includes local model inference (llama3.2, qwen3.5), basic generative UI widgets.
- **Pro Plan**: $29/month, supports multi-agent orchestration, advanced tools (Weather, SearchDocs, Calculator), and persistent history.
- **Enterprise Plan**: $99/month, includes private model fine-tuning, SLA, and custom generative UI component registries.

## Available Integrations
- Local Ollama runtime (`http://localhost:11434`)
- OpenUI Lang parser and `@openuidev/react-ui` component library
- Rails Active Record chat persistence
