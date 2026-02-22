# DetectFlow — No-Code Visual Detection Platform

Build custom image classifiers without writing code or training models.
Upload examples → define categories → detect anything.

## How It Works
1. Create a detector (e.g., "Dog Breed Classifier")
2. Upload images with labels ("golden retriever", "husky", "poodle")
3. Run detection — CLIP zero-shot classification scores each label
4. Labels cached, inference in ~3 seconds

## Tech Stack
- Next.js 16 + TypeScript + Tailwind
- PostgreSQL + Prisma ORM
- OpenAI CLIP via Replicate API (zero-shot classification)
- Async detection pipeline with polling

## Architecture Decision Records
- **Why CLIP over fine-tuning?** Zero-shot = instant. No GPU, no training time. Users get results in minutes, not hours.
- **Why PostgreSQL JSONB for labels?** Schema flexibility without migrations. Different detectors can have different label structures.
- **Why async detection?** Inference takes 3-5s. Async prevents request timeouts and enables future queue-based scaling.

## Product Thinking
- **North Star Metric:** Weekly Active Detections
- **Target User:** Domain expert who knows what to detect but can't code
- **Moat:** Data flywheel — every detection improves future accuracy via fine-tuning
