import os
import grpc
from tqdm import tqdm
import superbuilder_middleware_pb2 as sb
import helpers.config as config

def download(stub, url, local_path):
    progress_bar = tqdm(desc="Downloading", unit="%")
    try:
        for response in stub.DownloadFiles(sb.DownloadFilesRequest(FileUrl=url, localPath=local_path)):
            print(response.FileDownloaded)
            if int(response.progress) < 0:
                continue
            if "ERROR" in response.FileDownloaded:
                raise Exception(response.FileDownloaded)
            
            progress_bar.n = int(response.progress)
            progress_bar.refresh()
            if int(response.progress) == 100:
                break
    except grpc.RpcError as e:
        print(f"Model download failed: {e.details()}")

def switch(stub, local_model_path, model_name):
    if not os.path.exists(local_model_path):
        return f"Local folder for model '{model_name}' does not exist."
    response = stub.SetModels(sb.SetModelsRequest(assistant=model_name))
    return response.message


DEFAULT_MODEL_PATH="C:\\ProgramData\\IntelAIA\\local_models"
DEFAULT_EMBEDDER = "bge-base-en-v1.5-int8-ov"
DEFAULT_RERANKER = "bge-reranker-base-int8-ov"

def set_model(stub, model_name):
    response = stub.SetModels(sb.SetModelsRequest(llm= os.path.join(DEFAULT_MODEL_PATH, model_name), 
                                                  embedder=os.path.join(DEFAULT_MODEL_PATH, DEFAULT_EMBEDDER),
                                                  ranker=os.path.join(DEFAULT_MODEL_PATH, DEFAULT_RERANKER)))
    return response
