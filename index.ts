import { serve } from "bun";
import { client, store } from "./config/redis";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { index } from "./config/vector";
import { client as QStashClient } from "./config/qstash";
import { model } from "./config/gemini";
import { PromptTemplate } from "@langchain/core/prompts";
import { ConversationSummaryMemory } from "langchain/memory";
import { RunnableSequence } from "@langchain/core/runnables";

const messages = [
  { role: "user", content: "Hello" },
  { role: "bot", content: "Hi!" },
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const server = serve({
  port: 3000,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    let response;

    if (pathname == "/get") {
      response = (await store.mget(["message:id:0", "message:id:1"])).map(
        (m) => {
          return JSON.parse(decoder.decode(m));
        }
      );
    }

    if (pathname == "/yield") {
      const yieldedKeys = [];
      for await (const key of store.yieldKeys("message:id:")) {
        yieldedKeys.push(key);
      }
      response = yieldedKeys;
    }

    if (pathname == "/set") {
      await store.mset(
        messages.map((message, index) => [
          `message:id:${index}`,
          encoder.encode(JSON.stringify(message)),
        ])
      );
      response = "Byte Data Stored in RedisByteStore!";
    }

    if (pathname == "/upsert") {
      const documents = [
        { id: "doc1", data: "Upstash Vector is a scalable vector database." },
        {
          id: "doc2",
          data: "LangChain is a framework for building intelligent apps.",
        },
      ];

      await index.upsert(documents, {
        namespace: "user2",
      });
      response = "Documents upserted in Vectore STore!";
    }

    if (pathname == "/response") {
      const question = "What is Langchain?";

      const retrievedData = await index.query(
        {
          data: question,
          topK: 1,
          includeData: true,
        },
        {
          namespace: "user2",
        }
      );

      const relevantData = retrievedData.map((data) => data.data);

      // const query = `Answer : ${question} with context to context ${relevantData}`;

      // // direct model invokation
      // const res = (await model.invoke(query)).content;

      const prompt = PromptTemplate.fromTemplate(`
        Answer the user query {question} in relative to the Context: {relevantData}
        `);

      // chaining invokation (runnable sequences)
      const chain = RunnableSequence.from([prompt, model]);

      response = (
        await chain.invoke({
          question,
          relevantData,
        })
      ).text;
    }

    if (pathname == "/store") {
      response = await index.fetch(["doc1", "doc2"], {
        includeData: true,
        includeMetadata: true,
        // includeVectors: true,
        namespace: "user2",
      });

      //   response = await index.listNamespaces();
    }

    if (pathname == "/publish") {
      response = await QStashClient.publishJSON({
        url: "https://upstash.com/",
        body: { hello: "world" },
        retries: 2,
      });
    }

    // response = Array.from({ length: 5 }).map((_, index) => {
    //   if (index % 2 === 0) {
    //     return new AIMessage("ai stuff...");
    //   }
    //   return new HumanMessage("human stuff...");
    // });

    return new Response(JSON.stringify(response), {
      status: 200,
    });
  },
  error(error: Error) {
    return new Response("Something Went Wrong: " + error.message, {
      status: 500,
    });
  },
});
