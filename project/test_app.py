# test_openai.py
import openai
import os
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv('OPENAI_API_KEY')

try:
    response = openai.chat.completions.create(
        model='gpt-3.5-turbo',
        messages=[{"role": "user", "content": "Hello, how are you?"}],
        max_tokens=50,
        temperature=0.7,
    )
    assistant_reply = response.choices[0].message.content.strip()
    print("Assistant:", assistant_reply)
except Exception as e:
    print('OpenAI API Error:', e)
