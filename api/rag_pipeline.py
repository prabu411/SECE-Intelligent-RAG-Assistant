import os
import logging
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from openai import OpenAI

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

class RAGPipeline:
    def __init__(self):
        logging.info("Initializing RAG Pipeline...")
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Initialize Vector Store
        try:
            self.vectorstore = Chroma(
                persist_directory=DB_DIR, 
                embedding_function=self.embeddings
            )
            logging.info("Connected to ChromaDB.")
        except Exception as e:
            logging.error(f"Error connecting to ChromaDB: {e}")
            self.vectorstore = None

        # Initialize API Keys
        self.openai_key = os.environ.get("OPENAI_API_KEY")
        self.grok_key = os.environ.get("GROK_API")
        self.gemini_key = os.environ.get("GEMINI")
        
        if not any([self.openai_key, self.grok_key, self.gemini_key]) or self.openai_key == "your_openai_api_key_here":
            logging.warning("No valid LLM API keys found. Generation will fail.")
            
    def ask(self, question: str, history: list = None) -> dict:
        if not self.vectorstore:
            return {"answer": "Vector database not initialized. Please run the indexing step.", "sources": []}
            
        # 1. Retrieve top-k chunks
        docs = self.vectorstore.similarity_search(question, k=5)
        
        if not docs:
            return {
                "answer": "I couldn't find any relevant information on the SECE website for your query.", 
                "sources": []
            }
            
        # 2. Extract context and sources
        context_parts = []
        sources_seen = set()
        sources = []
        
        for doc in docs:
            context_parts.append(doc.page_content)
            source_url = doc.metadata.get("source", "Unknown")
            if source_url not in sources_seen and source_url != "Unknown":
                sources_seen.add(source_url)
                sources.append({
                    "url": source_url,
                    "title": doc.metadata.get("title", "Untitled"),
                    "section": doc.metadata.get("section", "")
                })
                
        context_text = "\n\n---\n\n".join(context_parts)
        
        if not any([self.openai_key, self.grok_key, self.gemini_key]) or self.openai_key == "your_openai_api_key_here":
            return {
                "answer": f"API keys missing. Here is the retrieved context instead:\n\n{context_text}",
                "sources": sources
            }
            
        # 3. Construct prompt
        system_prompt = (
            "You are an AI assistant for Sri Eshwar College of Engineering (SECE). "
            "You must answer the user's question based strictly on the provided context. "
            "CRITICAL INSTRUCTION: If the context does not explicitly contain the answer, you MUST respond EXACTLY with 'I couldn't find that information on the SECE website.' "
            "DO NOT attempt to answer from your own knowledge. DO NOT hallucinate. Keep answers clear, concise, and helpful."
        )
        
        user_prompt = f"Context information is below.\n\n---------------------\n{context_text}\n---------------------\n\nQuestion: {question}\nAnswer:"
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Append history if any (simplified)
        if history:
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
                
        messages.append({"role": "user", "content": user_prompt})
        
        # 4. Generate Answer with Fallback
        answer = None
        error_logs = []

        # Try OpenAI
        if not answer and self.openai_key and self.openai_key != "your_openai_api_key_here":
            try:
                client = OpenAI(api_key=self.openai_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    temperature=0.0,
                    max_tokens=500
                )
                answer = response.choices[0].message.content
                logging.info("Successfully generated answer using OpenAI.")
            except Exception as e:
                error_logs.append(f"OpenAI failed: {e}")
                logging.error(f"OpenAI fallback triggered: {e}")

        # Try Grok
        if not answer and self.grok_key:
            try:
                client = OpenAI(api_key=self.grok_key, base_url="https://api.x.ai/v1")
                response = client.chat.completions.create(
                    model="grok-beta",
                    messages=messages,
                    temperature=0.0,
                    max_tokens=500
                )
                answer = response.choices[0].message.content
                logging.info("Successfully generated answer using Grok.")
            except Exception as e:
                error_logs.append(f"Grok failed: {e}")
                logging.error(f"Grok fallback triggered: {e}")

        # Try Gemini
        if not answer and self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_prompt)
                
                chat_history = ""
                if history:
                    for msg in history:
                        chat_history += f"{msg['role']}: {msg['content']}\n"
                
                full_prompt = chat_history + user_prompt
                
                response = model.generate_content(
                    full_prompt,
                    generation_config=genai.types.GenerationConfig(temperature=0.0)
                )
                answer = response.text
                logging.info("Successfully generated answer using Gemini.")
            except Exception as e:
                error_logs.append(f"Gemini failed: {e}")
                logging.error(f"Gemini fallback triggered: {e}")

        if not answer:
            answer = "Sorry, all LLM providers failed to generate an answer.\nLogs:\n" + "\n".join(error_logs)
            
        return {
            "answer": answer,
            "sources": sources
        }

# Singleton instance
pipeline = RAGPipeline()
