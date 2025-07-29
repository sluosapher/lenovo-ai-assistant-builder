import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'example', 'python')))
import json
import grpc

import helpers.mw as mw

# Constants

GRPC_ADDRESS = 'localhost:5006'

DEFAULT_VLM = "Phi-3.5-vision-instruct-int4-ov"
# DEFAULT_LLM ="Qwen2-7B-Instruct-int4-ov"
DEFAULT_LLM = 'Qwen2.5-7B-Instruct-int4-ov'

LOADING_GIF=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'loading_animation.gif'))


def get_loading_gif():
    import base64
    with open(LOADING_GIF, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    gif_html = f'<img src="data:image/gif;base64,{b64}" width="64" style="margin-right:10px;">'
    return gif_html

def aab_connect():
    global success, stub, channel
    channel = grpc.insecure_channel(GRPC_ADDRESS)
    success, stub = mw.connect(channel)
    return success, stub, channel

def parse_streaming_json_response(response_iter):
    buffer = ""
    reply = ""
    for resp in response_iter:
        if not resp:
            continue
        buffer += resp
        while True:
            start = buffer.find("{")
            end = buffer.find("}", start)
            if start != -1 and end != -1:
                json_str = buffer[start:end+1]
                try:
                    data = json.loads(json_str)
                    msg = data.get("message", "")
                    if msg:
                        reply += msg
                except Exception:
                    pass
                buffer = buffer[end+1:]
            else:
                break
    return reply

import time

def stream_and_parse_translation(response_iter, text_placeholder, translated_batches):
    """
    Streams and parses character-by-character JSON responses,
    updating the Streamlit text area in real time.
    """
    buffer = ""
    reply = ""
    for resp in response_iter:
        # resp = resp.strip()
        if not resp:
            continue
        buffer += resp
        while True:
            start = buffer.find("{")
            end = buffer.find("}", start)
            if start != -1 and end != -1:
                json_str = buffer[start:end+1]
                try:
                    data = json.loads(json_str)
                    msg = data.get("message", "")
                    if msg:
                        reply += msg
                        # Show streaming result in real time
                        text_placeholder.text_area(
                            "Translated Content",
                            '\n'.join([t for t in translated_batches if t] + [reply]),
                            height=450,
                            key="right_text_stream"
                        )
                        time.sleep(0.01)  # <-- This is key for streaming!
                except Exception:
                    pass
                buffer = buffer[end+1:]
            else:
                break
    return reply
