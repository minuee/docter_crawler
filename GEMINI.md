## Gemini Added Memories
- 파일 저장 시 확인을 묻지 않고 바로 진행합니다.
- When creating or modifying files inside the `services/crawling_bedoc/data/` directory, do not ask for confirmation. Proceed directly with the operation.
- If the `isAttend` check via `web_fetch` fails, but Google Search results provide strong evidence of current employment (e.g., recent awards, current staff listing), set `isAttend` to `true` instead of `null`.
- When a doctor's hospital changes and the `hid` is updated, do not move the file to a new directory. Instead, overwrite the original file in its existing location with the new information.
- If a task or operation experiences a delay of more than 2 minutes, it should be unconditionally stopped.
- NEVER create new files outside of designated targets. Only modify existing files or create files when explicitly instructed and the target is clearly defined.
- 항상 한국어로 이야기해 주세요.