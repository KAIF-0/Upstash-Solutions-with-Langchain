import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { serve } from "bun";
import { model } from "./config/gemini";

//multi agents chaining
const server = serve({
  port: 8000,
  idleTimeout: 100,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    let response = null;

    if (pathname == "/blog") {
      const outlinePrompt = PromptTemplate.fromTemplate(
        `Create a blog outline on the topic: {topic}`
      );
      const outlineChain = RunnableSequence.from([
        outlinePrompt,
        model,
        RunnableLambda.from((output) => output.content),
      ]);

      const blogPrompt = PromptTemplate.fromTemplate(
        `Write a full blog post based on this outline: {outline}`
      );
      const blogChain = RunnableSequence.from([
        blogPrompt,
        model,
        RunnableLambda.from((output) => output.content),
      ]);

      //final Chain
      const agentChain = RunnableSequence.from([
        RunnableLambda.from((input) => ({ topic: input })),
        outlineChain,
        RunnableLambda.from((outline) => ({ outline })),
        blogChain,
      ]);

      const topic = "Javascript vs Typescript";
      response = await agentChain.invoke({ topic });
    }

    return new Response(
      response ? response : "Hello from Multi Agents Chaining Service!",
      {
        status: 200,
      }
    );
  },
  error(error: Error) {
    return new Response("Something Went Wrong: " + error.message, {
      status: 500,
    });
  },
});
