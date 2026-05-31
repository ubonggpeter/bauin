/**
 * prisma/seed.ts
 * Run: npx prisma db seed
 *
 * Seeds:
 *  • 1 Super Admin
 *  • 7 Categories (fees, 5 topics × 3 sub-topics, 20 questions each)
 *  • 5 Workers   (certified in 1-2 categories)
 *  • 3 Sellers   (2 stories each, 5 episodes + memory-game content)
 *  • 5 Distributors (active collection + live quiz session)
 *  • PlatformSettings defaults
 */
import { PrismaClient, CorrectOption } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT = 12;
const hashPw = (p: string) => bcrypt.hash(p, SALT);

// ─── Tiny helpers ────────────────────────────────────────────────────
let _rIdx = 0;
const nextRef = (prefix = "BAUIN") =>
  `${prefix}${String(++_rIdx).padStart(7, "0")}`;

// publicLinkCode for distributor collections (9 upper-alphanum chars)
const linkCode = (seed: string): string => {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 9; i++) {
    out += alpha[(seed.charCodeAt(i % seed.length) + i * 7) % alpha.length];
  }
  return out;
};

// ─── Category questions ──────────────────────────────────────────────
type Q = {
  q: string; a: string; b: string; c: string; d: string;
  correct: "A" | "B" | "C" | "D"; exp: string; diff?: number;
};

const QUESTIONS: Record<string, Q[]> = {
  "ai-content": [
    { q: "Which AI platform is primarily designed for copywriting and marketing content?", a: "Jasper", b: "TensorFlow", c: "DALL-E", d: "PyTorch", correct: "A", exp: "Jasper (formerly Jarvis) is an AI writing platform built for marketing copy and long-form content.", diff: 1 },
    { q: "What does 'prompt engineering' mean?", a: "Building AI chips", b: "Crafting inputs that guide AI to produce desired outputs", c: "Training a language model from scratch", d: "Compressing AI model weights", correct: "B", exp: "Prompt engineering is the practice of designing and refining prompts to steer AI output quality and direction." },
    { q: "What is an AI 'hallucination'?", a: "A creative writing style", b: "A neural-network architecture", c: "When a model confidently generates false information", d: "An image-generation glitch", correct: "C", exp: "AI hallucination refers to cases where a model outputs plausible-sounding but factually incorrect information." },
    { q: "Which format is best for giving a large language model structured instructions?", a: "Binary encoding", b: "Markdown headers and bullet points", c: "Hexadecimal codes", d: "XML namespaces", correct: "B", exp: "Markdown headers and bullets help LLMs parse structured instructions and respond in kind." },
    { q: "What is 'chain-of-thought' prompting?", a: "Linking multiple AI APIs", b: "Asking the AI to reason step-by-step before answering", c: "Storing chat history in a database", d: "Fine-tuning on sequential data", correct: "B", exp: "Chain-of-thought prompting instructs the model to articulate intermediate reasoning, improving accuracy on complex tasks." },
    { q: "Which metric best measures the effectiveness of AI-generated blog content?", a: "Token count", b: "Organic search traffic and engagement", c: "Inference latency", d: "Model perplexity score", correct: "B", exp: "For content marketing, organic traffic and user engagement (time on page, bounce rate) are the most meaningful KPIs." },
    { q: "What is 'fine-tuning' in the context of AI writing tools?", a: "Spell-checking AI output", b: "Adjusting font settings", c: "Further training a pre-trained model on a specific dataset", d: "Reducing the model's token limit", correct: "C", exp: "Fine-tuning adapts a pre-trained model to a narrower domain or style by training it on targeted examples." },
    { q: "What does 'temperature' control in a language model's generation?", a: "CPU heat management", b: "The randomness / creativity of the output", c: "The length of the response", d: "Grammar checking strictness", correct: "B", exp: "Temperature scales the probability distribution over tokens; higher values produce more varied, creative text." },
    { q: "Which approach minimises AI-generated plagiarism concerns?", a: "Copy output verbatim", b: "Use only public-domain prompts", c: "Treat AI output as a draft and rewrite in your own voice", d: "Increase the temperature to maximum", correct: "C", exp: "Using AI output as a first draft that is then substantially rewritten differentiates your content and reduces plagiarism risk." },
    { q: "What is a 'system prompt' in a chat-based AI model?", a: "The GPU firmware instructions", b: "A hidden instruction that sets the model's persona and constraints", c: "The user's first message", d: "A compression algorithm", correct: "B", exp: "A system prompt is a privileged instruction given to the model before the user turn to shape behaviour, tone, and scope." },
    { q: "Which content type is best suited for AI generation without heavy human editing?", a: "Published academic research", b: "Legal contracts", c: "Social media post drafts and idea outlines", d: "Medical diagnoses", correct: "C", exp: "Social posts and outline drafts are low-stakes and benefit from AI speed; high-stakes content (legal, medical) requires expert review." },
    { q: "SEO stands for:", a: "Semantic Engine Optimisation", b: "Search Engine Optimisation", c: "Structured Editorial Output", d: "System Encoding Operations", correct: "B", exp: "Search Engine Optimisation is the practice of improving content so it ranks higher in search engine results pages." },
    { q: "What is 'content repurposing'?", a: "Deleting old blog posts", b: "Transforming existing content into new formats (e.g., blog → video)", c: "Copying competitors' content", d: "Running paid ads on existing articles", correct: "B", exp: "Repurposing extends content lifespan and reach by adapting it into new formats suited for different audiences." },
    { q: "Which model developed by Anthropic powers Claude AI?", a: "GPT-4", b: "LLaMA 3", c: "Claude (Sonnet / Opus series)", d: "Gemini Ultra", correct: "C", exp: "Anthropic's Claude models (Haiku, Sonnet, Opus) power the Claude AI assistant." },
    { q: "What is the best practice before publishing AI-generated factual content?", a: "Increase the model temperature", b: "Fact-check with authoritative sources", c: "Run it through another AI", d: "Add more keywords", correct: "B", exp: "Always verify AI-generated facts against reliable primary sources before publication." },
    { q: "What does 'context window' mean in LLMs?", a: "The browser tab size", b: "The maximum tokens the model can process in one interaction", c: "The marketing funnel stage", d: "A caching mechanism", correct: "B", exp: "Context window is the maximum number of input+output tokens the model can handle at once; exceeding it truncates earlier content." },
    { q: "Which AI tool specialises in generating images from text prompts?", a: "Claude", b: "DALL-E / Midjourney / Stable Diffusion", c: "Grammarly", d: "Semrush", correct: "B", exp: "DALL-E, Midjourney, and Stable Diffusion are text-to-image AI tools." },
    { q: "What is the main advantage of using AI for content briefs?", a: "Eliminates the need for human writers", b: "Speeds up keyword research and outline creation significantly", c: "Guarantees top Google rankings", d: "Removes copyright restrictions", correct: "B", exp: "AI can rapidly generate comprehensive content briefs and outlines, freeing writers to focus on quality and creativity." },
    { q: "What is 'few-shot prompting'?", a: "Limiting the model to three responses", b: "Providing a few examples in the prompt to guide the AI's output format", c: "Training a model on a small dataset", d: "Reducing the model's response length", correct: "B", exp: "Few-shot prompting includes 2-5 input-output examples in the prompt so the model learns the expected format by analogy." },
    { q: "Which tactic improves the tone consistency of AI-written content across an entire article?", a: "Using a high temperature", b: "Defining a clear persona and style guide in the system prompt", c: "Generating each section separately without context", d: "Using the shortest possible prompts", correct: "B", exp: "A detailed system prompt with persona, tone, and style guidelines keeps the model consistent across all sections." },
  ],

  "data-analytics": [
    { q: "Which Python library is the de-facto standard for data manipulation?", a: "NumPy", b: "Pandas", c: "Matplotlib", d: "Seaborn", correct: "B", exp: "Pandas provides DataFrame structures and rich data manipulation functions for Python-based analytics." },
    { q: "Which SQL clause filters rows after aggregation?", a: "WHERE", b: "GROUP BY", c: "HAVING", d: "ORDER BY", correct: "C", exp: "HAVING filters the results of GROUP BY aggregations, while WHERE filters rows before aggregation." },
    { q: "What does ETL stand for?", a: "Extract, Transfer, Load", b: "Extract, Transform, Load", c: "Evaluate, Test, Launch", d: "Encode, Train, Label", correct: "B", exp: "ETL (Extract, Transform, Load) is the standard data pipeline pattern for moving data from source to data warehouse." },
    { q: "A box plot visualises:", a: "Correlation between two variables", b: "Distribution, median, quartiles, and outliers of a dataset", c: "Time-series trends only", d: "Categorical proportions", correct: "B", exp: "Box plots show median, IQR (Q1-Q3), whiskers, and outliers, giving a compact distribution summary." },
    { q: "What is the purpose of a pivot table?", a: "To rotate images", b: "To summarise and aggregate large datasets interactively", c: "To join two SQL tables", d: "To validate data schemas", correct: "B", exp: "Pivot tables let analysts cross-tabulate and aggregate data by rows and column categories quickly." },
    { q: "Which measure is most robust to extreme outliers?", a: "Mean", b: "Standard deviation", c: "Median", d: "Variance", correct: "C", exp: "The median is the middle value and is not affected by extreme values, unlike the mean." },
    { q: "What does `df.groupby('city').agg({'sales': 'sum'})` return in Pandas?", a: "The original DataFrame sorted by city", b: "Total sales per city", c: "Average sales across all rows", d: "A filtered DataFrame of cities", correct: "B", exp: "groupby() splits the data by 'city', and agg({'sales':'sum'}) computes the sum of sales within each group." },
    { q: "What is a 'primary key' in a relational database?", a: "The first column in any table", b: "A unique identifier for each row in a table", c: "A foreign reference to another table", d: "An indexed numeric sequence", correct: "B", exp: "A primary key uniquely identifies each record in a table; no two rows can share the same primary key value." },
    { q: "Which chart type is best for showing trends over time?", a: "Pie chart", b: "Scatter plot", c: "Bar chart", d: "Line chart", correct: "D", exp: "Line charts are ideal for visualising continuous data over time because they emphasise trends and direction of change." },
    { q: "In statistics, a p-value below 0.05 typically means:", a: "The result is practically significant", b: "We reject the null hypothesis at 5% significance level", c: "The sample size is too small", d: "The effect size is large", correct: "B", exp: "A p-value < 0.05 means there is less than 5% probability of observing the result by chance, so we reject H₀." },
    { q: "What does 'normalisation' mean in data preprocessing?", a: "Removing duplicate rows", b: "Scaling features to a common range (e.g., 0-1)", c: "Converting text to lowercase", d: "Encoding categorical variables", correct: "B", exp: "Normalisation (min-max scaling) rescales features to [0,1] so no single feature dominates distance-based algorithms." },
    { q: "Which SQL JOIN returns only rows with matching values in both tables?", a: "LEFT JOIN", b: "RIGHT JOIN", c: "FULL OUTER JOIN", d: "INNER JOIN", correct: "D", exp: "INNER JOIN returns only rows where the join condition is met in both tables." },
    { q: "What is a KPI?", a: "Key Performance Indicator", b: "Kernel Processing Interface", c: "Knowledge Pipeline Integration", d: "Key Pivot Index", correct: "A", exp: "KPI (Key Performance Indicator) is a measurable value that demonstrates how effectively a business is achieving objectives." },
    { q: "What is overfitting in machine learning?", a: "When a model learns noise and performs poorly on new data", b: "When training takes too long", c: "When the dataset is too large", d: "When accuracy exceeds 100%", correct: "A", exp: "Overfitting happens when a model memorises training data, including noise, and fails to generalise to unseen data." },
    { q: "Which visualisation shows the relationship between two numeric variables?", a: "Histogram", b: "Scatter plot", c: "Stacked bar chart", d: "Heatmap only", correct: "B", exp: "Scatter plots place each observation as a point in a 2D space defined by two numeric variables, revealing correlations." },
    { q: "What does the Pandas `.describe()` method return?", a: "Column data types", b: "Summary statistics (count, mean, std, min, quartiles, max)", c: "The first five rows", d: "Missing value counts", correct: "B", exp: ".describe() computes descriptive statistics for numeric columns: count, mean, std, min, 25%, 50%, 75%, max." },
    { q: "In a data warehouse, a 'fact table' contains:", a: "Dimension descriptions", b: "Measurable business events (e.g., sales transactions)", c: "User authentication records", d: "ETL job logs", correct: "B", exp: "Fact tables store quantitative, measurable data about business events, while dimension tables provide context." },
    { q: "Which Python library is primarily used for creating visualisations?", a: "Pandas", b: "Requests", c: "Matplotlib", d: "SQLAlchemy", correct: "C", exp: "Matplotlib is Python's foundational plotting library; Seaborn and Plotly are popular extensions." },
    { q: "What does 'data wrangling' mean?", a: "Securing data with encryption", b: "Cleaning, transforming, and structuring raw data for analysis", c: "Presenting data in dashboards", d: "Archiving old data", correct: "B", exp: "Data wrangling (munging) is the process of transforming raw data into a usable format for analysis." },
    { q: "A correlation coefficient of -0.9 indicates:", a: "No relationship", b: "A strong positive linear relationship", c: "A strong negative linear relationship", d: "Non-linear correlation only", correct: "C", exp: "A correlation of -0.9 indicates a strong negative linear relationship: as one variable increases, the other strongly decreases." },
  ],

  "ai-developer": [
    { q: "What does 'backpropagation' do in neural network training?", a: "Loads data into the model", b: "Computes gradients and propagates error backward to update weights", c: "Normalises input features", d: "Initialises weights randomly", correct: "B", exp: "Backpropagation applies the chain rule to compute gradients of the loss w.r.t. each weight, enabling gradient descent." },
    { q: "Which Python framework is most popular for deep learning?", a: "Scikit-learn", b: "XGBoost", c: "PyTorch / TensorFlow", d: "Statsmodels", correct: "C", exp: "PyTorch (Meta) and TensorFlow (Google) are the dominant deep learning frameworks used in research and production." },
    { q: "What is a transformer model's key innovation?", a: "Convolutional layers", b: "Recurrent hidden states", c: "The self-attention mechanism", d: "Decision trees", correct: "C", exp: "Transformers use self-attention to capture relationships between all tokens in a sequence in parallel, replacing RNNs." },
    { q: "What does 'tokenisation' mean in NLP?", a: "Encrypting text", b: "Splitting text into smaller units (tokens) the model can process", c: "Translating text to vectors only", d: "Removing stop words", correct: "B", exp: "Tokenisation breaks text into sub-word or word units (tokens) that map to model vocabulary indices." },
    { q: "What is 'transfer learning'?", a: "Moving data between servers", b: "Using a model pre-trained on a large dataset as a starting point for a new task", c: "Converting models between frameworks", d: "Distributing training across GPUs", correct: "B", exp: "Transfer learning leverages a model's pre-learned representations, drastically reducing training time and data requirements." },
    { q: "What is the purpose of dropout in a neural network?", a: "Speed up inference", b: "Reduce overfitting by randomly zeroing activations during training", c: "Initialise weights correctly", d: "Balance class weights", correct: "B", exp: "Dropout randomly deactivates neurons during training, preventing co-adaptation and acting as an ensemble regulariser." },
    { q: "Which loss function is standard for multi-class classification?", a: "Mean Squared Error", b: "Binary Cross-Entropy", c: "Categorical Cross-Entropy", d: "Hinge Loss", correct: "C", exp: "Categorical cross-entropy measures the divergence between the predicted probability distribution and the one-hot ground truth." },
    { q: "What does RAG stand for in AI development?", a: "Rapid Accuracy Gain", b: "Retrieval-Augmented Generation", c: "Recursive Attention Graph", d: "Regularised Activation Gate", correct: "B", exp: "RAG combines retrieval (fetching relevant documents) with generation, allowing LLMs to ground answers in external knowledge." },
    { q: "What is 'inference' in the context of deploying an ML model?", a: "Training the model on new data", b: "Using a trained model to generate predictions on new inputs", c: "Evaluating model fairness", d: "Compiling model weights", correct: "B", exp: "Inference is the process of running a trained model on new, unseen data to produce outputs." },
    { q: "What does REST stand for in API design?", a: "Recursive State Transfer", b: "Representational State Transfer", c: "Remote Execution of Sequential Tasks", d: "Reliable Encrypted Service Transport", correct: "B", exp: "REST (Representational State Transfer) is an architectural style for APIs using HTTP methods (GET, POST, PUT, DELETE)." },
    { q: "What is 'batch size' in model training?", a: "The number of training epochs", b: "The learning rate multiplier", c: "The number of samples processed before the model updates weights", d: "The total dataset size", correct: "C", exp: "Batch size controls how many training samples are processed in a single forward-backward pass before weights are updated." },
    { q: "Which metric measures classification model accuracy on imbalanced datasets?", a: "Accuracy", b: "F1-Score", c: "Mean Absolute Error", d: "R² Score", correct: "B", exp: "F1-Score (harmonic mean of precision and recall) handles class imbalance better than raw accuracy." },
    { q: "What is an 'embedding' in machine learning?", a: "Embedding a model in a mobile app", b: "A dense, low-dimensional vector representation of data", c: "A type of activation function", d: "A training optimiser", correct: "B", exp: "Embeddings map discrete objects (words, users, items) into continuous vector spaces where semantic similarity maps to distance." },
    { q: "What is 'quantisation' of an AI model?", a: "Measuring model accuracy", b: "Reducing numerical precision (e.g., float32 → int8) to reduce size and speed up inference", c: "Converting a model to a different framework", d: "Increasing the number of parameters", correct: "B", exp: "Quantisation compresses model weights to lower precision, reducing memory footprint and accelerating inference, often with minimal accuracy loss." },
    { q: "Which tool is used to track ML experiments and compare model runs?", a: "Docker", b: "MLflow / Weights & Biases", c: "Nginx", d: "Redis", correct: "B", exp: "MLflow and Weights & Biases log parameters, metrics, and artefacts across experiment runs for comparison and reproducibility." },
    { q: "What is a 'vector database' used for?", a: "Storing time-series data", b: "Storing and querying high-dimensional embedding vectors for semantic similarity search", c: "Running SQL queries", d: "Caching API responses", correct: "B", exp: "Vector databases (Pinecone, Weaviate, pgvector) enable fast approximate nearest-neighbour search over embedding vectors." },
    { q: "What does 'RLHF' stand for?", a: "Reinforced Learning for Human Feedback", b: "Reinforcement Learning from Human Feedback", c: "Recursive Language with Human Fine-tuning", d: "Random Learning in High-Frequency", correct: "B", exp: "RLHF trains a reward model from human preference data, then fine-tunes the LLM using reinforcement learning to align with human values." },
    { q: "In a convolutional neural network, what do filters learn?", a: "Data normalisation parameters", b: "Spatial features like edges, textures, and patterns in images", c: "Token attention weights", d: "Sequence ordering", correct: "B", exp: "CNN filters (kernels) learn to detect spatial patterns: early layers detect edges; deeper layers detect complex features." },
    { q: "What is 'model distillation'?", a: "Cleaning training data", b: "Training a smaller 'student' model to mimic a larger 'teacher' model", c: "Reducing the dataset size", d: "Exporting a model to ONNX format", correct: "B", exp: "Knowledge distillation compresses large models by training a smaller model to replicate the large model's soft predictions." },
    { q: "Which architecture powers modern large language models?", a: "Convolutional Neural Network", b: "Recurrent Neural Network", c: "Transformer", d: "Support Vector Machine", correct: "C", exp: "Transformers, introduced in 'Attention Is All You Need' (2017), underpin all major LLMs including GPT, Claude, Gemini, and LLaMA." },
  ],

  "digital-marketing": [
    { q: "What does CTR stand for?", a: "Click-Through Rate", b: "Customer Transfer Ratio", c: "Content Targeting Reach", d: "Conversion Traffic Rate", correct: "A", exp: "CTR = (clicks / impressions) × 100. It measures how often people who see an ad or link actually click it." },
    { q: "What is a 'marketing funnel'?", a: "A social media algorithm", b: "The journey a prospect takes from awareness to purchase", c: "An email automation platform", d: "A paid advertising format", correct: "B", exp: "The marketing funnel models customer journey stages: Awareness → Interest → Consideration → Intent → Conversion." },
    { q: "Which social platform is best for B2B lead generation?", a: "TikTok", b: "Snapchat", c: "LinkedIn", d: "Pinterest", correct: "C", exp: "LinkedIn's professional network and targeting capabilities make it the leading platform for B2B marketing and lead generation." },
    { q: "What is A/B testing in digital marketing?", a: "Testing two different products", b: "Comparing two versions of a page/ad to see which performs better", c: "Running ads on two platforms simultaneously", d: "Splitting a budget between channels", correct: "B", exp: "A/B testing (split testing) shows two variants to different audience segments to determine which achieves higher conversion." },
    { q: "What is 'organic reach'?", a: "Traffic from paid ads", b: "The number of people who see content without paid promotion", c: "Influencer-generated traffic", d: "Email subscriber count", correct: "B", exp: "Organic reach is the audience your content reaches without paid amplification, driven by SEO, social shares, and direct traffic." },
    { q: "What does CPA stand for?", a: "Cost Per Acquisition", b: "Click Per Ad", c: "Content Publishing Algorithm", d: "Customer Preference Analysis", correct: "A", exp: "CPA measures the cost of acquiring a customer through a specific campaign; CPA = total spend / number of conversions." },
    { q: "What is 'retargeting'?", a: "Rewriting ad copy", b: "Showing ads to users who previously visited your website", c: "Targeting a new demographic", d: "Reposting content on social media", correct: "B", exp: "Retargeting uses cookies/pixels to serve ads to users who have already interacted with your brand, re-engaging warm leads." },
    { q: "What does SEO primarily improve?", a: "Paid ad performance", b: "Email open rates", c: "Organic search ranking and visibility", d: "Social media follower growth", correct: "C", exp: "SEO (Search Engine Optimisation) improves a website's visibility in organic (unpaid) search engine results." },
    { q: "What is 'content marketing'?", a: "Buying ad placements", b: "Creating and distributing valuable content to attract and retain an audience", c: "Managing social media accounts", d: "Cold calling prospects", correct: "B", exp: "Content marketing builds brand authority and trust by delivering valuable, relevant content that attracts and converts prospects." },
    { q: "What is the primary purpose of an email nurture sequence?", a: "To collect email addresses", b: "To guide leads through the buying journey with targeted, timed emails", c: "To send promotional offers only", d: "To unsubscribe inactive users", correct: "B", exp: "Nurture sequences deliver personalised, staged emails that educate leads and move them progressively toward conversion." },
    { q: "What is 'lookalike audience' targeting?", a: "Targeting users who look similar to influencers", b: "Finding new users who share characteristics with existing customers", c: "Retargeting website visitors", d: "Targeting by location", correct: "B", exp: "Lookalike audiences let platforms (Facebook, Google) find users with similar traits to your existing customer base." },
    { q: "Which metric indicates the long-term revenue value of a customer?", a: "CPC", b: "CTR", c: "CLV (Customer Lifetime Value)", d: "CPA", correct: "C", exp: "CLV (Customer Lifetime Value) estimates the total revenue a business can expect from a customer over their entire relationship." },
    { q: "What is a 'landing page'?", a: "The website homepage", b: "A standalone page designed for a specific campaign or conversion goal", c: "The error page", d: "The product catalogue page", correct: "B", exp: "Landing pages are campaign-specific pages optimised for a single CTA (call-to-action), removing navigation distractions." },
    { q: "What does ROAS stand for?", a: "Return On Ad Spend", b: "Rate Of Audience Share", c: "Reach Of Ad Signals", d: "Revenue Of Affiliate Sales", correct: "A", exp: "ROAS = revenue from ads / ad spend. It measures how much revenue is generated per naira/dollar spent on advertising." },
    { q: "What is 'viral content' in social media marketing?", a: "Malware-infected posts", b: "Content that spreads rapidly through social sharing", c: "Paid influencer posts", d: "Email newsletters", correct: "B", exp: "Viral content achieves rapid, exponential sharing through social networks, generating massive organic reach at minimal cost." },
    { q: "What is the best way to reduce email unsubscribe rates?", a: "Increase email frequency", b: "Segment your list and send relevant, personalised content", c: "Remove the unsubscribe button", d: "Only send promotional offers", correct: "B", exp: "List segmentation and personalisation ensure subscribers receive content relevant to their interests, reducing unsubscribes." },
    { q: "What is 'influencer marketing'?", a: "Paying celebrities to appear in TV ads", b: "Leveraging individuals with engaged audiences to promote products/services", c: "SEO link-building strategy", d: "AI-generated advertising", correct: "B", exp: "Influencer marketing uses content creators with established audiences to reach target demographics authentically." },
    { q: "Which type of keyword has lower competition but higher conversion intent?", a: "Short-tail keywords", b: "Broad match keywords", c: "Long-tail keywords", d: "Branded keywords", correct: "C", exp: "Long-tail keywords (3+ words) are more specific, have lower search volume but much higher purchase intent and lower competition." },
    { q: "What is 'social proof' in marketing?", a: "Verified social media accounts", b: "Using testimonials, reviews, and user evidence to build trust", c: "Paid social media advertising", d: "Proving ad spend ROI", correct: "B", exp: "Social proof (reviews, case studies, testimonials) leverages others' positive experiences to build credibility and reduce buyer anxiety." },
    { q: "What does 'funnel optimisation' mean?", a: "Making the website load faster", b: "Identifying and fixing drop-off points in the customer journey to improve conversion", c: "Increasing ad spend", d: "Adding more steps to the checkout process", correct: "B", exp: "Funnel optimisation analyses where prospects abandon the conversion path and applies targeted improvements to increase completion rates." },
  ],

  "ai-tutor": [
    { q: "What is 'instructional design'?", a: "Designing school buildings", b: "The systematic process of creating effective learning experiences", c: "Writing textbooks manually", d: "Managing student records", correct: "B", exp: "Instructional design applies learning science to create structured, goal-oriented educational experiences." },
    { q: "What does LMS stand for?", a: "Learning Management System", b: "Language Model Server", c: "Lesson Module Standard", d: "Learning Metric Scale", correct: "A", exp: "An LMS (Learning Management System) is software that delivers, tracks, and manages eLearning courses and student progress." },
    { q: "Which learning theory emphasises discovery and building on prior knowledge?", a: "Behaviourism", b: "Connectivism", c: "Constructivism", d: "Positivism", correct: "C", exp: "Constructivism (Piaget, Vygotsky) holds that learners build knowledge by connecting new information to existing mental models." },
    { q: "What is 'adaptive learning' in AI education?", a: "Students adapting to new teachers", b: "Systems that personalise content and pace based on each learner's performance", c: "AI replacing all human teachers", d: "Using AI to grade essays only", correct: "B", exp: "Adaptive learning platforms use AI to dynamically adjust difficulty, content, and pacing to each learner's needs and progress." },
    { q: "What is the 'spacing effect' in memory research?", a: "Studying in large blocks", b: "Learning improves when study sessions are spaced over time rather than crammed", c: "Using wide margins in notes", d: "Taking longer breaks between lessons", correct: "B", exp: "Spaced repetition distributes learning over increasing intervals, leveraging the forgetting curve to improve long-term retention." },
    { q: "Which type of assessment checks understanding during the learning process?", a: "Summative assessment", b: "Formative assessment", c: "Diagnostic assessment", d: "Standardised testing", correct: "B", exp: "Formative assessment (quizzes, polls, check-ins) provides ongoing feedback during learning; summative assessment evaluates at the end." },
    { q: "What is 'Bloom's Taxonomy'?", a: "A plant classification system", b: "A framework for categorising educational learning objectives by cognitive level", c: "A grading rubric for essays", d: "A teaching certification programme", correct: "B", exp: "Bloom's Taxonomy (Knowledge → Comprehension → Application → Analysis → Synthesis → Evaluation) guides learning objective design." },
    { q: "What does 'asynchronous learning' mean?", a: "Live, simultaneous instruction", b: "Learning that does not occur in real-time; students access content at their own pace", c: "Group projects done together", d: "Synchronised video lectures", correct: "B", exp: "Asynchronous learning (recorded videos, text, forums) lets students progress independently, offering flexibility in time and location." },
    { q: "What is 'gamification' in education?", a: "Playing video games in class", b: "Applying game design elements (points, badges, leaderboards) to learning to boost engagement", c: "Teaching game development", d: "Using VR for all lessons", correct: "B", exp: "Gamification uses rewards, competition, and progression mechanics to increase motivation and engagement in educational contexts." },
    { q: "What is the primary benefit of 'microlearning'?", a: "Covers entire curricula in one session", b: "Delivers focused, bite-sized content that fits into busy schedules and improves retention", c: "Replaces all traditional courses", d: "Reduces assessment needs", correct: "B", exp: "Microlearning (2-10 min modules) aligns with attention spans, fits into workflows, and leverages the spacing effect for better retention." },
    { q: "What does 'Universal Design for Learning' (UDL) promote?", a: "Identical instruction for all students", b: "Flexible learning methods that accommodate diverse learner needs", c: "Only visual learning styles", d: "Standardised testing for all ages", correct: "B", exp: "UDL provides multiple means of representation, engagement, and expression to reduce barriers and support all learners." },
    { q: "Which AI feature helps tutors personalise homework feedback at scale?", a: "Chatbot avatars", b: "Automated essay scoring and feedback generation", c: "Facial recognition attendance", d: "Voice-to-text transcription only", correct: "B", exp: "AI essay scoring tools (like Gradescope) analyse writing and generate formative feedback, freeing teachers for higher-order support." },
    { q: "What is 'scaffolding' in education?", a: "Building a classroom from scratch", b: "Temporary support provided to help learners accomplish tasks beyond their current ability", c: "Using visual aids exclusively", d: "Peer assessment methods", correct: "B", exp: "Scaffolding (Vygotsky) provides guided support that is gradually removed as learners develop competence." },
    { q: "What is a 'learning objective'?", a: "A broad educational philosophy", b: "A specific, measurable statement describing what a learner will be able to do after instruction", c: "The course completion certificate", d: "A teaching evaluation form", correct: "B", exp: "Learning objectives use action verbs (explain, demonstrate, analyse) to specify measurable outcomes of a lesson or course." },
    { q: "What is 'synchronous e-learning'?", a: "Pre-recorded video courses", b: "Real-time online instruction where teacher and students interact simultaneously", c: "Self-paced reading material", d: "Offline textbook study", correct: "B", exp: "Synchronous e-learning (Zoom, Teams classes) replicates real-time classroom interaction in a virtual environment." },
    { q: "Which AI tool can generate personalised quiz questions from a lesson?", a: "Grammarly", b: "Khanmigo / ChatGPT-based quiz generators", c: "Google Calendar", d: "Zoom Whiteboard", correct: "B", exp: "AI tools can analyse lesson content and automatically generate varied, level-appropriate quiz questions, saving teacher time." },
    { q: "What is 'retrieval practice'?", a: "Retrieving information from the internet", b: "Recalling information from memory through testing, which strengthens long-term retention", c: "Re-reading notes repeatedly", d: "Downloading study materials", correct: "B", exp: "Retrieval practice (the testing effect) shows that actively recalling information (quizzes, flashcards) outperforms passive re-reading." },
    { q: "What does 'differentiated instruction' mean?", a: "Teaching only advanced students", b: "Tailoring teaching methods, content, and pace to meet individual student needs", c: "Offering different subjects to different schools", d: "Separating students by ability group permanently", correct: "B", exp: "Differentiated instruction recognises learner variability and adjusts content complexity, process, and assessment accordingly." },
    { q: "Which metric best measures eLearning course effectiveness?", a: "Course completion rate alone", b: "Kirkpatrick's four levels: Reaction, Learning, Behaviour, Results", c: "Number of videos in the course", d: "Platform uptime", correct: "B", exp: "Kirkpatrick's model evaluates training at four levels: learner satisfaction, knowledge gain, behaviour change, and business impact." },
    { q: "What is 'SCORM' in eLearning?", a: "A student scoring rubric", b: "A standard for eLearning content to communicate with LMS platforms", c: "A type of assessment format", d: "A video compression codec", correct: "B", exp: "SCORM (Sharable Content Object Reference Model) defines how eLearning content packages communicate progress and scores to an LMS." },
  ],

  "video-editing": [
    { q: "What is a 'timeline' in video editing software?", a: "A project deadline", b: "The linear arrangement of video, audio, and effect layers in a sequence", c: "A rendering progress bar", d: "A transition between scenes", correct: "B", exp: "The timeline is the core workspace in video editors (Premiere, DaVinci, Final Cut) where clips are assembled in sequence." },
    { q: "What does 'colour grading' mean?", a: "Rating video quality", b: "Stylistically altering the colour and tone of footage to achieve a creative look", c: "Exporting in colour vs. black-and-white", d: "Adding colour text overlays", correct: "B", exp: "Colour grading goes beyond colour correction to apply a creative, consistent visual tone or 'look' to footage." },
    { q: "What is a 'cut' in video editing?", a: "Removing the audio track", b: "An instantaneous transition from one shot to the next", c: "A slow dissolve between scenes", d: "Splitting a clip into two parts", correct: "B", exp: "A cut is the most basic edit: one shot ends and another begins instantly, with no transition effect." },
    { q: "What does 'bitrate' affect in a video file?", a: "Playback speed", b: "The amount of data encoded per second, affecting quality and file size", c: "The colour depth only", d: "Frame aspect ratio", correct: "B", exp: "Higher bitrate means more data per second, yielding better quality but larger files; lower bitrate reduces file size at the cost of quality." },
    { q: "What is 'LUT' used for in video production?", a: "Lookup Table — applies a preset colour transformation to footage", b: "Layer Unification Tool", c: "Luminance Upscaling Technique", d: "Low-latency Upload Technology", correct: "A", exp: "A LUT (Look-Up Table) maps input colours to output colours, quickly applying colour grades or converting colour spaces." },
    { q: "What is 'J-cut' editing technique?", a: "Cutting at the exact beat of music", b: "Audio from the next clip starts before the video transition", c: "An abrupt jump cut between scenes", d: "A J-shaped motion path for graphics", correct: "B", exp: "A J-cut lets audio from the incoming scene lead the visual, creating a smooth, natural transition that guides the viewer's ear." },
    { q: "What does 'codec' stand for in video?", a: "Colour Decode", b: "Coder-Decoder — a format for compressing and decompressing video data", c: "Computer Optical Data Compression Engine", d: "Content Output Delivery Code", correct: "B", exp: "A codec (e.g., H.264, H.265, ProRes) encodes video for storage and decodes it for playback, balancing quality and compression." },
    { q: "What is 'b-roll' footage?", a: "Low-quality backup footage", b: "Supplemental footage that supports and illustrates the main interview or narration", c: "Behind-the-scenes content only", d: "Black-and-white archival footage", correct: "B", exp: "B-roll provides visual context for the main story, prevents talking-head monotony, and covers jump cuts." },
    { q: "What frame rate is standard for cinematic films?", a: "25 fps", b: "60 fps", c: "24 fps", d: "120 fps", correct: "C", exp: "24 fps (frames per second) has been the cinema standard since the sound era, creating the characteristic 'film look'." },
    { q: "What does 'keyframe' mean in animation and editing?", a: "The first frame of a video", b: "A frame where a value is set; software interpolates between keyframes", c: "A frame requiring manual colouring", d: "The master export frame", correct: "B", exp: "Keyframes mark specific values (position, opacity, scale) at a point in time; the software animates by interpolating between them." },
    { q: "What is 'audio normalisation'?", a: "Converting stereo to mono", b: "Adjusting audio levels so the loudest point hits a target level (e.g., -14 LUFS)", c: "Adding music to a video", d: "Removing background noise", correct: "B", exp: "Normalisation ensures consistent loudness across a project, important for broadcast standards and streaming platform compliance." },
    { q: "Which format is best for delivering high-quality video for online streaming?", a: "AVI", b: "H.264 / H.265 (MP4)", c: "MJPEG", d: "DV25", correct: "B", exp: "H.264 and H.265 provide excellent quality-to-file-size ratios and are widely supported by all streaming platforms and devices." },
    { q: "What is a 'dissolve' transition?", a: "An instant switch between clips", b: "One clip gradually fades out while the next fades in, overlapping", c: "A wipe from left to right", d: "A zoom into the next clip", correct: "B", exp: "A dissolve (cross-dissolve) blends outgoing and incoming clips, often used to suggest passage of time or smooth flow." },
    { q: "What is '4K' resolution?", a: "A frame rate setting", b: "Approximately 4,000 horizontal pixels (e.g., 3840×2160 UHD)", c: "A codec standard", d: "A colour grading mode", correct: "B", exp: "4K UHD (3840×2160) is four times the pixel count of 1080p Full HD, offering much greater detail and cropping flexibility." },
    { q: "What does 'proxy editing' mean?", a: "Editing on a remote server", b: "Using low-resolution copies for editing, then relinking to originals for export", c: "Editing with only keyboard shortcuts", d: "Using a third-party editor as a proxy for the main tool", correct: "B", exp: "Proxy files reduce the strain of editing large RAW or 4K files; the NLE relinks to full-res originals at export." },
    { q: "What is 'motion blur' in video effects?", a: "A shaky camera effect", b: "The visual blurring of fast-moving objects as the camera sensor captures their trail", c: "Blurring the background only", d: "A rendering artefact from slow computers", correct: "B", exp: "Motion blur mimics how camera shutters capture movement; it makes animation and motion graphics appear more natural and cinematic." },
    { q: "What is 'colour correction'?", a: "Choosing a visual colour palette", b: "Fixing technical colour problems to make footage look natural and consistent", c: "Adding colour grading LUTs", d: "Converting sRGB to CMYK", correct: "B", exp: "Colour correction fixes white balance, exposure, and hue issues to create a neutral, true-to-life baseline before creative grading." },
    { q: "Which software is widely used for professional video editing?", a: "Photoshop", b: "Adobe Premiere Pro / DaVinci Resolve / Final Cut Pro", c: "Illustrator", d: "Lightroom", correct: "B", exp: "Premiere Pro, DaVinci Resolve, and Final Cut Pro are industry-standard NLEs for professional video editing." },
    { q: "What is an 'L-cut'?", a: "A diagonal wipe transition", b: "Audio from the outgoing clip continues while the incoming video begins", c: "A logo animation cut-in", d: "Cutting to a lower frame rate", correct: "B", exp: "An L-cut keeps outgoing audio playing under the incoming video, useful for carrying dialogue or ambient sound across a scene change." },
    { q: "What is 'chroma key' (green screen) compositing?", a: "A colour grading technique", b: "Removing a specific colour (usually green) from footage to composite different backgrounds", c: "Adding colour fringing effects", d: "Keying music to video beats", correct: "B", exp: "Chroma key removes a uniform colour (green or blue) from footage, allowing any background to be composited behind the subject." },
  ],

  "crypto-defi": [
    { q: "What is a blockchain?", a: "A type of cryptocurrency wallet", b: "A distributed, immutable ledger of transactions maintained by a network of nodes", c: "A centralised database managed by banks", d: "A programming language for smart contracts", correct: "B", exp: "A blockchain is a chain of blocks, each containing verified transactions, distributed across a decentralised peer-to-peer network." },
    { q: "What does 'DeFi' stand for?", a: "Decentralised Finance", b: "Digital Federal Interest", c: "Distributed Fiat Index", d: "Decentralised Fiat Infrastructure", correct: "A", exp: "DeFi (Decentralised Finance) refers to financial services built on open blockchains without traditional intermediaries like banks." },
    { q: "What is a 'smart contract'?", a: "A legally binding paper contract for crypto transactions", b: "Self-executing code on a blockchain that automatically enforces agreement terms", c: "An AI-powered trading algorithm", d: "A secure messaging protocol", correct: "B", exp: "Smart contracts run automatically when predefined conditions are met, eliminating the need for trusted intermediaries." },
    { q: "What does 'gas fee' mean on Ethereum?", a: "A cryptocurrency mining expense", b: "The transaction fee paid to network validators for processing operations on Ethereum", c: "The price of converting ETH to fiat", d: "A surcharge for slow transactions", correct: "B", exp: "Gas fees compensate Ethereum validators for the computational resources required to process and secure transactions." },
    { q: "What is a 'non-custodial wallet'?", a: "A wallet held by an exchange on your behalf", b: "A wallet where only you hold the private keys, giving full control over funds", c: "A hardware wallet made by a third party", d: "A wallet requiring KYC to open", correct: "B", exp: "Non-custodial wallets (MetaMask, Phantom) give users sole control of private keys; custodial wallets (exchanges) hold keys for you." },
    { q: "What is 'liquidity mining' (yield farming)?", a: "Mining Bitcoin with liquid cooling", b: "Providing liquidity to DeFi protocols in exchange for token rewards", c: "Staking ETH in a pool", d: "Trading volatile assets for short-term gains", correct: "B", exp: "Yield farming earns token rewards by depositing assets into DeFi liquidity pools, often at high (but risky) APYs." },
    { q: "What does 'APY' stand for in DeFi?", a: "Automated Protocol Yield", b: "Annual Percentage Yield — the real rate of return including compound interest", c: "Asset Price Yield", d: "Aggregate Pool Yield", correct: "B", exp: "APY accounts for compounding, unlike APR; a DeFi protocol paying 1% monthly has an APY of ~12.68% not 12%." },
    { q: "What is an NFT?", a: "A type of DeFi lending protocol", b: "A Non-Fungible Token — a unique digital asset verified on a blockchain", c: "A no-fee transaction token", d: "A network file transfer protocol", correct: "B", exp: "NFTs are unique blockchain tokens that prove ownership of a digital item; unlike cryptocurrencies, each NFT is distinct and non-interchangeable." },
    { q: "What is a '51% attack' on a blockchain?", a: "When 51% of users sell their tokens simultaneously", b: "When an entity controls over 50% of mining/validating power, enabling transaction manipulation", c: "A regulatory enforcement action", d: "A smart contract bug affecting 51% of users", correct: "B", exp: "A 51% attack allows the controlling entity to double-spend and reverse transactions, undermining blockchain integrity." },
    { q: "What is 'impermanent loss' in DeFi?", a: "Losing access to a wallet temporarily", b: "The loss experienced by liquidity providers when asset prices diverge from the deposit ratio", c: "A gas fee that cannot be recovered", d: "A failed smart contract exploit", correct: "B", exp: "Impermanent loss occurs when the price ratio of pooled assets changes; LPs may hold less value than if they had simply HODLed." },
    { q: "What does 'HODL' mean in crypto culture?", a: "High-Optimised Decentralised Ledger", b: "Hold On for Dear Life — a strategy of holding crypto long-term despite price volatility", c: "A type of crypto trading order", d: "An acronym for hot wallet operations", correct: "B", exp: "HODL originated from a typo of 'hold' and became a meme strategy for holding cryptocurrency through market downturns." },
    { q: "What is a 'seed phrase' (recovery phrase)?", a: "A password for a centralised exchange", b: "A 12-24 word sequence that backs up and restores a crypto wallet", c: "An initial allocation of tokens in an ICO", d: "A smart contract deployment key", correct: "B", exp: "A seed phrase (BIP-39 mnemonic) deterministically derives all wallet keys; anyone with it has full access to all associated funds." },
    { q: "What is 'staking' in crypto?", a: "Selling tokens for profit", b: "Locking tokens to participate in network validation and earn rewards", c: "Borrowing tokens for trading", d: "Sending tokens to a burn address", correct: "B", exp: "Staking locks tokens in a Proof-of-Stake network to validate transactions; stakers earn rewards but face slashing for misbehaviour." },
    { q: "What is a 'DEX'?", a: "A digital exchange rate index", b: "A Decentralised Exchange — allows peer-to-peer token trading without a central authority", c: "A data exchange protocol", d: "A derivative exchange product", correct: "B", exp: "DEXs (Uniswap, PancakeSwap) use automated market makers (AMMs) and smart contracts to enable non-custodial token swaps." },
    { q: "What does 'DYOR' mean in crypto communities?", a: "Develop Your Own Roadmap", b: "Do Your Own Research", c: "Deploy Your On-chain Rules", d: "Diversify Your Outstanding Returns", correct: "B", exp: "DYOR (Do Your Own Research) is crypto advice to independently verify information before investing, rather than blindly following tips." },
    { q: "What is 'rug pull' in DeFi?", a: "A regulatory crackdown on a project", b: "When developers abandon a project and drain its liquidity, leaving investors with worthless tokens", c: "A rapid price crash caused by whale selling", d: "A smart contract audit failure", correct: "B", exp: "A rug pull is an exit scam where developers suddenly withdraw all liquidity or sell insider tokens, leaving investors with no recourse." },
    { q: "What blockchain does most DeFi activity occur on?", a: "Bitcoin", b: "Ethereum (and EVM-compatible chains like BNB Chain, Polygon, Arbitrum)", c: "Ripple", d: "Dogecoin", correct: "B", exp: "Ethereum and EVM-compatible chains host the vast majority of DeFi TVL due to mature tooling, smart contracts, and developer ecosystem." },
    { q: "What is 'flash loan' in DeFi?", a: "An instant crypto payment", b: "An uncollateralised loan that must be borrowed and repaid within a single blockchain transaction", c: "A short-term loan with collateral", d: "A high-speed trading algorithm", correct: "B", exp: "Flash loans (Aave) enable uncollateralised borrowing for arbitrage or liquidations, with automatic repayment enforced by the smart contract." },
    { q: "What is 'market capitalisation' of a cryptocurrency?", a: "The maximum supply of coins ever minted", b: "Total circulating supply × current price per coin", c: "The exchange-listed price", d: "The total trading volume in 24 hours", correct: "B", exp: "Market cap = circulating supply × price. It is the most common metric for comparing the size of different cryptocurrencies." },
    { q: "What does 'layer 2' mean in blockchain scalability?", a: "The second layer of blockchain security", b: "A secondary protocol built on top of a base blockchain to increase transaction throughput and reduce fees", c: "The backup node network", d: "A type of smart contract", correct: "B", exp: "Layer 2s (Lightning Network, Arbitrum, Optimism) process transactions off the main chain, settling batched proofs on L1, vastly improving scalability." },
  ],
};

// ─── Topic + SubTopic data ────────────────────────────────────────────
const TOPICS_DATA: Record<string, { title: string; subTopics: { title: string; content: string }[] }[]> = {
  "ai-content": [
    { title: "Introduction to AI Writing", subTopics: [
      { title: "What is AI Writing?", content: "AI writing uses large language models (LLMs) to generate human-like text from prompts. Models like GPT-4, Claude, and Gemini can write blogs, copy, scripts, and more." },
      { title: "Popular AI Writing Tools", content: "Leading tools include Jasper, Copy.ai, Writesonic, Claude, and ChatGPT. Each has different strengths in copywriting, long-form, and SEO content." },
      { title: "Ethical Use of AI Content", content: "Always disclose AI-generated content where required. Verify all facts, avoid plagiarism, and add a human editorial layer for quality assurance." },
    ]},
    { title: "Prompt Engineering", subTopics: [
      { title: "Anatomy of a Great Prompt", content: "Effective prompts have four elements: role (who the AI is), context (background), task (what to do), and format (how to present the output)." },
      { title: "Advanced Techniques", content: "Chain-of-thought, few-shot, and zero-shot prompting techniques each suit different tasks. Practice iterating prompts to refine output quality." },
      { title: "System Prompts and Personas", content: "System prompts define the AI's persona, constraints, and tone. A well-crafted system prompt drastically improves consistency across a long project." },
    ]},
    { title: "SEO and AI Content", subTopics: [
      { title: "Keyword Research with AI", content: "AI tools can analyse search intent, suggest related keywords, and cluster topics, dramatically speeding up the keyword research process." },
      { title: "On-Page SEO Optimisation", content: "Ensure AI content includes the primary keyword in H1, meta description, first 100 words, and at a natural density throughout." },
      { title: "E-E-A-T Principles", content: "Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) requires adding human expertise, citations, and author bios to AI content." },
    ]},
    { title: "Content Strategy with AI", subTopics: [
      { title: "Content Calendars", content: "Use AI to plan a month of content: brainstorm topics, assign formats (blog, video, social), and align with product launch dates." },
      { title: "Content Repurposing", content: "Transform a single blog post into a Twitter thread, LinkedIn article, email newsletter, and YouTube script using AI, multiplying content ROI." },
      { title: "Audience Persona Development", content: "AI can synthesise customer data into detailed personas with demographics, pain points, goals, and preferred content formats." },
    ]},
    { title: "Monetising AI Content", subTopics: [
      { title: "Freelance AI Writing", content: "Offer AI-assisted content services at scale. Many clients pay ₦20,000–₦150,000 per article for quality, SEO-optimised, niche content." },
      { title: "Building a Content Agency", content: "Use AI to scale output while managing quality through human editors. A 3-person team can produce 50+ articles/month using AI workflows." },
      { title: "Affiliate Marketing with AI Content", content: "Create review and comparison sites with AI, then monetise through affiliate commissions. Niche authority sites can earn passive income." },
    ]},
  ],
  "data-analytics": [
    { title: "Data Fundamentals", subTopics: [
      { title: "Types of Data", content: "Data is classified as structured (tables), semi-structured (JSON, XML), or unstructured (text, images). Each requires different storage and analysis approaches." },
      { title: "Data Collection Methods", content: "Data is collected through surveys, APIs, web scraping, IoT sensors, transactional databases, and third-party data providers." },
      { title: "Data Quality and Cleaning", content: "Data quality dimensions include completeness, accuracy, consistency, and timeliness. Cleaning involves handling nulls, duplicates, and outliers." },
    ]},
    { title: "Python for Data Analysis", subTopics: [
      { title: "Pandas Essentials", content: "Pandas DataFrames enable reading (pd.read_csv), filtering, merging, grouping, and aggregating tabular data with readable, expressive syntax." },
      { title: "NumPy Arrays", content: "NumPy underpins Pandas and provides fast vectorised operations on multi-dimensional arrays, critical for numerical computing." },
      { title: "Data Pipelines", content: "Build reproducible pipelines that clean, transform, and load data using Python functions and libraries like Prefect or Apache Airflow." },
    ]},
    { title: "SQL for Analytics", subTopics: [
      { title: "SELECT and Filtering", content: "Master SELECT, WHERE, LIKE, IN, BETWEEN, and IS NULL to query and filter data efficiently from relational databases." },
      { title: "JOINs and Aggregations", content: "INNER, LEFT, RIGHT, and FULL JOINs combine tables. GROUP BY with SUM, COUNT, AVG, MAX, MIN aggregates data for reporting." },
      { title: "Window Functions", content: "Window functions (ROW_NUMBER, RANK, LAG, LEAD, SUM OVER PARTITION) perform running totals and ranking without collapsing rows." },
    ]},
    { title: "Data Visualisation", subTopics: [
      { title: "Choosing the Right Chart", content: "Bar charts compare categories; line charts show trends over time; scatter plots reveal correlations; histograms display distributions." },
      { title: "Dashboard Design Principles", content: "Effective dashboards have a clear purpose, minimal clutter, consistent colour, and actionable KPIs displayed in order of importance." },
      { title: "Matplotlib and Seaborn", content: "Matplotlib provides low-level control; Seaborn adds statistical visualisations and attractive defaults on top of Matplotlib." },
    ]},
    { title: "Machine Learning Basics", subTopics: [
      { title: "Supervised vs Unsupervised Learning", content: "Supervised learning trains on labelled data (classification, regression). Unsupervised discovers patterns without labels (clustering, dimensionality reduction)." },
      { title: "Model Evaluation Metrics", content: "Classification uses accuracy, precision, recall, F1, ROC-AUC. Regression uses MAE, RMSE, R². Choose based on the business problem." },
      { title: "Scikit-learn Workflow", content: "Scikit-learn's consistent API: load data → train/test split → fit model → predict → evaluate. Pipelines chain preprocessing and modelling steps." },
    ]},
  ],
  "ai-developer": [
    { title: "ML Fundamentals", subTopics: [
      { title: "The ML Workflow", content: "Problem definition → data collection → EDA → feature engineering → model training → evaluation → deployment → monitoring." },
      { title: "Linear and Logistic Regression", content: "Linear regression predicts continuous values; logistic regression predicts probabilities for binary classification using the sigmoid function." },
      { title: "Bias-Variance Tradeoff", content: "High bias = underfitting (too simple). High variance = overfitting (memorising noise). Optimal models balance both through regularisation and validation." },
    ]},
    { title: "Deep Learning", subTopics: [
      { title: "Neural Network Architecture", content: "Neural networks consist of input, hidden, and output layers. Neurons apply weights, biases, and activation functions (ReLU, sigmoid) to transform inputs." },
      { title: "Convolutional Networks (CNNs)", content: "CNNs use convolutional filters to detect spatial features in images. Architectures like ResNet and EfficientNet achieve state-of-the-art image classification." },
      { title: "Training Techniques", content: "Batch normalisation, dropout, learning rate scheduling, and early stopping are key techniques for stable, efficient neural network training." },
    ]},
    { title: "Natural Language Processing", subTopics: [
      { title: "Text Preprocessing", content: "NLP pipelines: tokenise → lowercase → remove stop words → stem/lemmatise → vectorise (TF-IDF, word2vec, or transformer embeddings)." },
      { title: "Transformers and Attention", content: "The self-attention mechanism lets each token attend to all others, capturing long-range dependencies. BERT uses bidirectional attention; GPT uses causal." },
      { title: "Working with LLM APIs", content: "Use the Anthropic or OpenAI SDK to call LLM APIs. Structure requests with system + user messages; handle rate limits and streaming responses." },
    ]},
    { title: "Model Deployment", subTopics: [
      { title: "REST API Serving", content: "Serve models with FastAPI or Flask. Package with Docker. Deploy to cloud (AWS Lambda, GCP Cloud Run, Azure) for scalable, serverless inference." },
      { title: "MLOps Basics", content: "MLOps applies DevOps to ML: version control models and data (DVC, MLflow), automate retraining pipelines, and monitor for data drift." },
      { title: "Optimisation for Production", content: "Use quantisation, pruning, ONNX export, and TensorRT to reduce model size and latency for production inference." },
    ]},
    { title: "AI APIs and Integration", subTopics: [
      { title: "Calling the Anthropic Claude API", content: "Install the SDK, set ANTHROPIC_API_KEY, and call client.messages.create() with model, max_tokens, and messages array to generate responses." },
      { title: "Building RAG Systems", content: "RAG: embed documents with an embedding model → store in vector DB → at query time, retrieve top-k chunks → pass as context to LLM." },
      { title: "Tool Use and Function Calling", content: "LLMs can call external functions/tools when given a schema. Use this to build agents that search the web, query databases, or execute code." },
    ]},
  ],
  "digital-marketing": [
    { title: "Social Media Marketing", subTopics: [
      { title: "Platform Selection Strategy", content: "Match platform to audience: LinkedIn for B2B, TikTok/Instagram for B2C youth, Facebook for broad demographics, Pinterest for visual products." },
      { title: "Content Formats and Algorithms", content: "Short-form video (Reels, TikTok) receives the highest organic reach. Algorithms reward consistency, engagement rate, and saves/shares over likes." },
      { title: "Community Management", content: "Respond to comments within 1 hour. Use brand voice consistently. Turn negative feedback into public demonstrations of great customer service." },
    ]},
    { title: "SEO and SEM", subTopics: [
      { title: "On-Page and Technical SEO", content: "Optimise title tags, meta descriptions, H1-H3 structure, Core Web Vitals, mobile-first design, and structured data (schema.org) for ranking." },
      { title: "Google Ads Campaigns", content: "Set clear goals (leads, sales, awareness). Use exact and phrase match keywords. Monitor Quality Score, CPC, and conversion rates to optimise bids." },
      { title: "Keyword Research and Clustering", content: "Use tools like Ahrefs, Semrush, or Google Keyword Planner. Cluster keywords by intent (informational, transactional) and create dedicated landing pages." },
    ]},
    { title: "Email Marketing", subTopics: [
      { title: "List Building and Segmentation", content: "Build lists with lead magnets (ebooks, webinars). Segment by behaviour, purchase history, and engagement level to personalise campaigns." },
      { title: "Email Copywriting", content: "Subject line (under 50 chars) determines open rate. Body copy: one clear CTA, scannable with short paragraphs, personalisation tokens ([First Name])." },
      { title: "Automation and Flows", content: "Set up welcome, nurture, cart abandonment, and re-engagement sequences. A/B test subject lines and send times to optimise open and click rates." },
    ]},
    { title: "Analytics and Attribution", subTopics: [
      { title: "Google Analytics 4 (GA4)", content: "GA4 is event-based. Track key events: page_view, purchase, form_submit. Use Explorations for funnel analysis and cohort reporting." },
      { title: "UTM Parameters", content: "Tag campaign URLs with utm_source, utm_medium, utm_campaign, utm_content for accurate attribution of traffic and conversions in analytics." },
      { title: "Attribution Models", content: "Last-click, first-click, linear, time-decay, and data-driven attribution models distribute conversion credit differently across touchpoints." },
    ]},
    { title: "Paid Advertising", subTopics: [
      { title: "Facebook and Instagram Ads", content: "Meta Ads Manager: choose objective → define audience (demographics, interests, lookalike) → create ad (image, video, carousel) → set budget and bid." },
      { title: "Ad Creative Best Practices", content: "Hook viewers in 3 seconds (video). Use social proof. Test multiple creatives. Clear CTA. Mobile-first design. Refresh creatives every 2-3 weeks." },
      { title: "Optimising for ROAS", content: "Calculate target ROAS from CLV and margins. Use campaign budget optimisation (CBO), broad targeting, and conversion API for improved performance." },
    ]},
  ],
  "ai-tutor": [
    { title: "Instructional Design Fundamentals", subTopics: [
      { title: "ADDIE Model", content: "ADDIE: Analysis (learner needs) → Design (objectives, structure) → Development (content creation) → Implementation (delivery) → Evaluation (results)." },
      { title: "Learning Objectives with Bloom's", content: "Write objectives using Bloom's action verbs: Remember (list), Understand (explain), Apply (use), Analyse (compare), Evaluate (judge), Create (design)." },
      { title: "Learner Analysis", content: "Assess prior knowledge, learning preferences, technical constraints, and motivation. Design for your specific learner, not a hypothetical average." },
    ]},
    { title: "AI Learning Tools", subTopics: [
      { title: "AI Tutoring Platforms", content: "Khan Academy's Khanmigo, Duolingo Max, Coursera Coach, and custom GPT tutors personalise learning and provide instant, on-demand explanations." },
      { title: "AI-Assisted Grading", content: "Tools like Gradescope and TurnItIn Origin use AI for essay feedback, rubric-based grading, and plagiarism detection, freeing teacher time." },
      { title: "Chatbot Tutors", content: "Build subject-specific tutors using LLM APIs with a system prompt defining scope, Socratic method, and hints policy to guide without giving answers." },
    ]},
    { title: "Curriculum Design", subTopics: [
      { title: "Scope and Sequence", content: "Define the full scope of knowledge (what students will learn) and sequence it logically from foundational to advanced, building on prior knowledge." },
      { title: "Backward Design (UbD)", content: "Wiggins & McTighe's UbD: start with desired outcomes → define evidence of learning → then design learning activities. 'Begin with the end in mind.'" },
      { title: "Microlearning Module Design", content: "Design 5-10 minute modules with one clear learning objective, interactive elements, a knowledge check, and a summary. Modular design enables personalisation." },
    ]},
    { title: "Assessment and Feedback", subTopics: [
      { title: "Formative Assessment Techniques", content: "Exit tickets, polling (Mentimeter), cold calling, think-pair-share, and digital quizzes give real-time insight into class understanding." },
      { title: "Rubric Design", content: "Effective rubrics have clear performance levels (4=Excellent, 3=Proficient, 2=Developing, 1=Beginning) with specific, observable criteria for each dimension." },
      { title: "AI Feedback Generation", content: "Prompt LLMs to generate specific, actionable feedback on student work using a rubric. Review AI feedback before sharing to ensure accuracy and sensitivity." },
    ]},
    { title: "Student Engagement", subTopics: [
      { title: "Gamification Implementation", content: "Add points, badges, leaderboards, and streaks using LMS gamification plugins (Moodle, Canvas). Set intrinsic goals beyond extrinsic rewards." },
      { title: "Interactive Video Techniques", content: "Embed quizzes in videos using H5P or EdPuzzle. Interactive branching scenarios let students make decisions and see consequences, boosting engagement." },
      { title: "Building Learning Communities", content: "Discussion forums, peer review, group projects, and live Q&A sessions create belonging, accountability, and collaborative learning beyond content consumption." },
    ]},
  ],
  "video-editing": [
    { title: "Video Editing Basics", subTopics: [
      { title: "Understanding the NLE Timeline", content: "Non-linear editing places video/audio clips on track layers. Higher tracks overlay lower tracks. Trim, ripple edit, and roll edit change cut points." },
      { title: "Importing and Organising Media", content: "Import footage into bins/folders organised by scene, shoot date, or type (A-roll, B-roll, music). Proxies reduce performance strain during editing." },
      { title: "Basic Cuts and Assembly Edit", content: "Start with an assembly edit: place all essential clips in rough order. Refine into a rough cut by removing mistakes, then a fine cut polishing timing." },
    ]},
    { title: "Colour Grading", subTopics: [
      { title: "Colour Correction Fundamentals", content: "Fix exposure (lift/gamma/gain), white balance (temperature/tint), and contrast in the primary colour wheels before applying any creative grade." },
      { title: "Working with LUTs", content: "Import LUTs in DaVinci Resolve or Premiere to instantly apply colour grades. Technical LUTs convert log footage to Rec.709; creative LUTs add style." },
      { title: "Scopes: Waveform and Vectorscope", content: "Waveform monitors exposure (0–100 IRE); vectorscope shows colour saturation and hue. Expose to broadcast safe levels (16–235 for 8-bit) to avoid clipping." },
    ]},
    { title: "Audio Editing", subTopics: [
      { title: "Audio Cleanup Techniques", content: "Remove background noise with Noise Reduction plugins. Equalise dialogue (high-pass at 80Hz, boost presence 2-5kHz). Normalise to -14 LUFS for streaming." },
      { title: "Music Licensing and Sync", content: "Use royalty-free music libraries (Epidemic Sound, Artlist, Musicbed) to legally sync tracks to video. Sync music to cuts on the beat for energy." },
      { title: "Audio Mixing Fundamentals", content: "Dialogue should sit at -12 to -6 dB. Music duck under dialogue at -20 to -30 dB. Sound effects fill space but shouldn't compete with dialogue." },
    ]},
    { title: "Motion Graphics", subTopics: [
      { title: "Titles and Lower Thirds", content: "Lower thirds identify speakers with name + role. Use clean sans-serif fonts, brand colours, and smooth in/out animations (2-3 frames eases)." },
      { title: "After Effects Integration", content: "Dynamic Link (Premiere↔After Effects) enables live compositing without re-exporting. Use Essential Graphics panel to create editable motion graphics templates." },
      { title: "Text Animation Principles", content: "Apply easing (ease in/out) to all animation. Stagger elements. Use scale, opacity, or position for entrance. Keep animations under 20 frames for titles." },
    ]},
    { title: "Export and Delivery", subTopics: [
      { title: "Export Settings for Different Platforms", content: "YouTube: H.264, 8Mbps+, AAC 320kbps, 4K or 1080p. Instagram Reels: 9:16, H.264, 3.5Mbps. Cinema: ProRes 422 HQ or DNxHD for quality." },
      { title: "Colour Spaces and Delivery Standards", content: "Deliver in Rec.709 (sRGB) for web and broadcast. Use DCI-P3 for cinema. Always confirm delivery specifications with the client before export." },
      { title: "Archiving and File Management", content: "Archive project files with all media, sequences, and exports. Use LTO tape or cloud (AWS Glacier) for long-term storage. Never delete camera originals." },
    ]},
  ],
  "crypto-defi": [
    { title: "Blockchain Fundamentals", subTopics: [
      { title: "How Blockchains Work", content: "Transactions are broadcast to nodes, verified by consensus (PoW or PoS), grouped into blocks, hashed (SHA-256 for Bitcoin), and chained immutably." },
      { title: "Consensus Mechanisms", content: "Proof of Work (Bitcoin) uses energy-intensive mining. Proof of Stake (Ethereum 2.0) selects validators by staked amount, reducing energy by 99%." },
      { title: "Wallets and Private Keys", content: "Private keys (256-bit) sign transactions. Public keys derive wallet addresses. Never share private keys. Use hardware wallets (Ledger, Trezor) for large holdings." },
    ]},
    { title: "DeFi Protocols", subTopics: [
      { title: "Automated Market Makers (AMMs)", content: "AMMs (Uniswap, Curve) use constant product formula (x*y=k) to price assets without order books. LPs provide assets and earn swap fees." },
      { title: "Lending and Borrowing", content: "Protocols like Aave and Compound allow over-collateralised lending. Borrowers deposit collateral (e.g., ETH), borrow up to 75%, pay variable interest." },
      { title: "Yield Aggregators", content: "Yearn Finance and Beefy auto-compound yields across protocols, saving gas and finding the highest APY for deposited assets automatically." },
    ]},
    { title: "NFTs and Digital Assets", subTopics: [
      { title: "ERC-721 vs ERC-1155", content: "ERC-721 defines unique NFT standard (one token = one item). ERC-1155 is multi-token standard supporting both fungible and non-fungible tokens efficiently." },
      { title: "NFT Marketplaces", content: "OpenSea, Magic Eden, Blur, and Foundation allow minting, buying, and selling NFTs. Blur introduced pro-trading features with fee rebates and aggregation." },
      { title: "NFT Utility Beyond Art", content: "NFTs enable token-gated communities, event tickets, gaming items, and proof of credentials — extending value beyond simple digital collectibles." },
    ]},
    { title: "Trading Strategies", subTopics: [
      { title: "Technical Analysis Basics", content: "Support/resistance levels, trend lines, moving averages (SMA, EMA), RSI, MACD, and Bollinger Bands are core indicators for crypto price analysis." },
      { title: "Risk Management", content: "Never invest more than you can afford to lose. Use stop-losses. Diversify across assets and strategies. Risk 1-2% per trade. Keep 20% in stablecoins." },
      { title: "On-Chain Analytics", content: "Tools like Glassnode, Nansen, and Dune Analytics reveal whale movements, exchange flows, and protocol metrics for informed trading decisions." },
    ]},
    { title: "Security and Safety", subTopics: [
      { title: "Common Scams and How to Avoid Them", content: "Rug pulls, phishing, fake airdrops, honeypot contracts. Verify contracts on Etherscan. Never click unsolicited links. Use revoke.cash to check approvals." },
      { title: "Smart Contract Auditing Basics", content: "Read audits from reputable firms (Certik, Trail of Bits, OpenZeppelin). Understand reentrancy, integer overflow, and access control vulnerabilities." },
      { title: "Self-Custody Best Practices", content: "Store seed phrase offline, split across multiple secure locations. Use multi-sig (Gnosis Safe) for large funds. Test recovery before depositing." },
    ]},
  ],
};

// ─── Story + episode data ─────────────────────────────────────────────
const STORY_DATA = [
  {
    sellerIdx: 0,
    title: "The Algorithm Millionaire",
    description: "The true story of how mastering AI tools transformed a broke graduate into a six-figure content creator in 12 months.",
    price: 2500,
    tags: ["AI", "Content Creation", "Success Story"],
    coverGradient: "primary",
    episodes: [
      { title: "Zero to Prompt", num: 1, desc: "How one bad freelancing month led to discovering AI writing tools — and why that failure was the turning point." },
      { title: "The Prompt Formula", num: 2, desc: "The exact 4-part prompt structure that generates publication-ready content 80% of the time." },
      { title: "Landing the First ₦500k Client", num: 3, desc: "Cold email templates, portfolio building with AI, and how to charge premium rates from day one." },
      { title: "Scaling to an Agency", num: 4, desc: "Hiring editors, systematising delivery, and building recurring revenue from retainer clients." },
      { title: "Passive Income with AI Content", num: 5, desc: "Building affiliate sites, newsletter empires, and licensing content frameworks for passive monthly income." },
    ],
  },
  {
    sellerIdx: 0,
    title: "Data Science Dreams",
    description: "A practical guide to breaking into data analytics without a computer science degree using Python, SQL, and free online tools.",
    price: 2000,
    tags: ["Data Science", "Python", "Career Change"],
    coverGradient: "blue",
    episodes: [
      { title: "Why Data? Why Now?", num: 1, desc: "The global demand for data skills and how even beginners can earn ₦300k/month with the right foundation." },
      { title: "Python in 30 Days", num: 2, desc: "A structured plan to go from zero Python to Pandas and visualisation in one month of focused practice." },
      { title: "SQL: The Hidden Superpower", num: 3, desc: "Master the 20% of SQL that covers 80% of analytics tasks — and get paid to query databases." },
      { title: "Your First Dashboard", num: 4, desc: "Building a business dashboard using Looker Studio (free) that impresses hiring managers and clients." },
      { title: "Getting Your First Data Job", num: 5, desc: "Resume, portfolio, LinkedIn profile, and interview prep to land your first data analytics role." },
    ],
  },
  {
    sellerIdx: 1,
    title: "The DeFi Revolution",
    description: "An insider's guide to navigating decentralised finance — from your first wallet to advanced yield strategies — without losing your shirt.",
    price: 3000,
    tags: ["DeFi", "Crypto", "Investing"],
    coverGradient: "amber",
    episodes: [
      { title: "Why DeFi Changes Everything", num: 1, desc: "The problem with traditional finance and how DeFi removes gatekeepers, giving everyone access to financial tools." },
      { title: "Setting Up Safely", num: 2, desc: "Choosing wallets, securing seed phrases, and the exact steps to set up MetaMask without getting hacked." },
      { title: "Liquidity Mining Demystified", num: 3, desc: "How to earn 20-100% APY by providing liquidity — and the real risks of impermanent loss explained clearly." },
      { title: "Navigating DeFi Protocols", num: 4, desc: "A guided tour of Uniswap, Aave, Compound, and Curve — what they do and how to use them safely." },
      { title: "Advanced Strategies and Risk", num: 5, desc: "Leveraged farming, stablecoin strategies, and how to calculate true risk-adjusted returns in DeFi." },
    ],
  },
  {
    sellerIdx: 1,
    title: "Code to Wealth",
    description: "How a self-taught developer used AI coding assistants to build and sell SaaS products, earning ₦5M in their first year.",
    price: 3500,
    tags: ["AI Developer", "SaaS", "Entrepreneurship"],
    coverGradient: "purple",
    episodes: [
      { title: "The AI-Assisted Developer", num: 1, desc: "How tools like GitHub Copilot, Claude, and Cursor AI have changed what one developer can ship in a week." },
      { title: "Finding the Profitable Problem", num: 2, desc: "A framework for identifying SaaS ideas with real paying customers before writing a single line of code." },
      { title: "Building Fast with AI", num: 3, desc: "Using AI to scaffold entire applications, write tests, and debug errors — cutting development time by 70%." },
      { title: "From MVP to First Sale", num: 4, desc: "Launching on Product Hunt, building in public, and converting Twitter followers into paying subscribers." },
      { title: "Scaling and Selling", num: 5, desc: "When to raise prices, how to reduce churn, and the anatomy of a profitable SaaS acquisition exit." },
    ],
  },
  {
    sellerIdx: 2,
    title: "Marketing Mastery with AI",
    description: "A complete playbook for digital marketers to use AI tools to double campaign performance, slash creative costs, and report better results.",
    price: 2200,
    tags: ["Marketing", "AI Tools", "Campaigns"],
    coverGradient: "green",
    episodes: [
      { title: "The AI Marketing Stack", num: 1, desc: "The 10 AI tools that have replaced entire departments — and which ones are worth the subscription fee." },
      { title: "AI Ad Creative at Scale", num: 2, desc: "Using Midjourney, Runway, and Claude to produce dozens of ad variants weekly without a design team." },
      { title: "Hyper-Personalisation", num: 3, desc: "Dynamic content, AI segmentation, and personalisation tokens that lift email open rates by 40%." },
      { title: "AI-Powered Analytics", num: 4, desc: "Let AI surface insights from your GA4 data, predict churn, and recommend budget reallocation automatically." },
      { title: "Reporting to Clients with AI", num: 5, desc: "Generate beautiful, data-driven client reports in minutes using AI — and charge premium retainers for the insight." },
    ],
  },
  {
    sellerIdx: 2,
    title: "The AI Tutor's Handbook",
    description: "A practical manual for educators wanting to integrate AI into teaching — creating better lessons, assessments, and student experiences.",
    price: 1800,
    tags: ["Education", "AI Tutor", "EdTech"],
    coverGradient: "teal",
    episodes: [
      { title: "Why AI Will Transform Teaching", num: 1, desc: "The shift from information delivery to learning facilitation — and why AI makes the best teachers better." },
      { title: "Building Your First AI Lesson", num: 2, desc: "Step-by-step guide to using Claude or ChatGPT to create differentiated lesson plans in 20 minutes." },
      { title: "AI-Powered Assessments", num: 3, desc: "Generating quizzes, essay prompts, and rubrics with AI — and how to validate AI-generated questions." },
      { title: "Student Engagement Tools", num: 4, desc: "Gamification, AI chatbot tutors, and interactive video — three strategies to transform passive learners." },
      { title: "Building an Online Course Business", num: 5, desc: "Packaging your teaching expertise into a course, using AI for marketing, and earning ₦1M+ per year." },
    ],
  },
];

// ─── Game content helper ──────────────────────────────────────────────
function makeGameContent(episodeTitle: string, storyTitle: string) {
  const slug = storyTitle.toLowerCase().replace(/\s+/g, "-");
  const emojis = ["🧠","💡","🎯","🔑","✨","📈","💰","🚀","🔥","⭐","🎓","💻","📊","🌟","💎"];
  const pick = (i: number) => emojis[i % emojis.length];

  const cards = Array.from({ length: 8 }, (_, i) => ({
    id: `${slug}-c${i}`, emoji: pick(i), label: `${episodeTitle} Card ${i + 1}`,
  }));
  const pairs = Array.from({ length: 6 }, (_, i) => ({
    id: `${slug}-p${i}`, term: `Term ${i + 1}`, definition: `Definition for Term ${i + 1} in ${episodeTitle}`,
  }));
  const prompts = Array.from({ length: 5 }, (_, i) => ({
    id: `${slug}-f${i}`, text: `The key concept of lesson ${i + 1} is ___`,
    answer: `concept-${i + 1}`, hint: `Think about ${episodeTitle}`,
  }));

  return {
    phase1: { type: "memory_grid",  cards,                              timeLimit: 30 },
    phase2: { type: "sequence",     sequence: cards.slice(0, 5),        timeLimit: 25 },
    phase3: { type: "match_pairs",  pairs,                              timeLimit: 40 },
    phase4: { type: "fill_blank",   prompts,                            timeLimit: 35 },
    phase5: { type: "speed_recall", items: cards.slice(0, 6),           timeLimit: 20 },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting BAUIN seed...\n");

  // ── 1. Clear database ────────────────────────────────────────────
  console.log("  🗑  Clearing existing data...");
  const truncate = (t: string) => prisma.$executeRawUnsafe(`TRUNCATE "${t}" CASCADE`);
  await truncate("users");
  await truncate("categories");
  await truncate("achievements");
  await truncate("weekly_competitions");
  await truncate("auto_approval_rules");
  await truncate("platform_settings");
  console.log("  ✅ Database cleared\n");

  // ── 2. Super Admin ───────────────────────────────────────────────
  console.log("  👑 Creating Super Admin...");
  const admin = await prisma.user.create({
    data: {
      name:         "BAUIN Admin",
      email:        "admin@bauin.com",
      passwordHash: await hashPw("Admin@2025!"),
      role:         "SUPER_ADMIN",
      referralCode: nextRef("ADM"),
      kycStatus:    "APPROVED",
      rank:         "BILLIONAIRE",
      phoneNumber:  "+2348000000001",
      isActive:     true,
    },
  });
  await prisma.wallet.create({ data: { userId: admin.id } });
  console.log(`  ✅ Admin: ${admin.email} / Admin@2025!\n`);

  // ── 3. Categories ────────────────────────────────────────────────
  console.log("  📚 Creating categories, courses, topics, sub-topics & questions...");

  const CATEGORY_META = [
    { name: "AI Content Creator",  slug: "ai-content",         registrationFee: 5000, monthlyFee: 2000, retryFee: 1500 },
    { name: "Data Analytics",      slug: "data-analytics",     registrationFee: 7000, monthlyFee: 2500, retryFee: 2000 },
    { name: "AI Developer",        slug: "ai-developer",       registrationFee: 10000,monthlyFee: 3000, retryFee: 2500 },
    { name: "Digital Marketing",   slug: "digital-marketing",  registrationFee: 5000, monthlyFee: 2000, retryFee: 1500 },
    { name: "AI Tutor",            slug: "ai-tutor",           registrationFee: 6000, monthlyFee: 2000, retryFee: 1500 },
    { name: "Video Editing",       slug: "video-editing",      registrationFee: 7000, monthlyFee: 2500, retryFee: 2000 },
    { name: "Crypto & DeFi",       slug: "crypto-defi",        registrationFee: 8000, monthlyFee: 3000, retryFee: 2500 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const meta of CATEGORY_META) {
    const cat = await prisma.category.create({
      data: {
        name:            meta.name,
        slug:            meta.slug,
        description:     `Master ${meta.name} skills and earn from certified gigs on the BAUIN platform.`,
        registrationFee: meta.registrationFee,
        monthlyFee:      meta.monthlyFee,
        retryFee:        meta.retryFee,
        passPercentage:  70,
        questionCount:   20,
        isActive:        true,
      },
    });
    categoryMap[meta.slug] = cat.id;

    // Course
    const course = await prisma.course.create({
      data: {
        categoryId:  cat.id,
        title:       `${meta.name} Certification Course`,
        description: `The official BAUIN certification course for ${meta.name}. Complete all modules and pass the test to earn your certificate.`,
        order:       1,
        isPublished: true,
      },
    });

    // Topics + SubTopics
    const topics = TOPICS_DATA[meta.slug] ?? [];
    for (let ti = 0; ti < topics.length; ti++) {
      const topicData = topics[ti];
      const topic = await prisma.topic.create({
        data: { courseId: course.id, title: topicData.title, order: ti + 1 },
      });
      for (let si = 0; si < topicData.subTopics.length; si++) {
        const st = topicData.subTopics[si];
        await prisma.subTopic.create({
          data: { topicId: topic.id, title: st.title, content: st.content, order: si + 1 },
        });
      }
    }

    // Questions (20 per category)
    const qs = QUESTIONS[meta.slug] ?? [];
    await prisma.testQuestion.createMany({
      data: qs.map((q, i) => ({
        categoryId:   cat.id,
        questionText: q.q,
        optionA:      q.a,
        optionB:      q.b,
        optionC:      q.c,
        optionD:      q.d,
        correctOption: q.correct as CorrectOption,
        explanation:  q.exp,
        difficulty:   q.diff ?? ((i % 3) + 1),
        isActive:     true,
      })),
    });

    process.stdout.write(`    ✔ ${meta.name}\n`);
  }

  const catIds  = Object.values(categoryMap);
  const catKeys = Object.keys(categoryMap);
  console.log("  ✅ Categories created\n");

  // ── 4. Workers ───────────────────────────────────────────────────
  console.log("  👷 Creating workers...");

  const WORKERS = [
    { name: "Amaka Obi",    email: "worker1@bauin.com", cats: [catIds[0], catIds[3]] },
    { name: "Tunde Adeyemi",email: "worker2@bauin.com", cats: [catIds[1], catIds[6]] },
    { name: "Chidi Eze",    email: "worker3@bauin.com", cats: [catIds[2], catIds[1]] },
    { name: "Ngozi Eze",    email: "worker4@bauin.com", cats: [catIds[4], catIds[5]] },
    { name: "Emeka Okafor", email: "worker5@bauin.com", cats: [catIds[3], catIds[0]] },
  ];

  const workers: { id: string; name: string }[] = [];

  for (let i = 0; i < WORKERS.length; i++) {
    const w = WORKERS[i];
    const user = await prisma.user.create({
      data: {
        name:         w.name,
        email:        w.email,
        passwordHash: await hashPw("Worker@2025!"),
        role:         "WORKER",
        referralCode: nextRef("WKR"),
        kycStatus:    "APPROVED",
        rank:         i < 2 ? "GOLD" : "SILVER",
        phoneNumber:  `+23480000001${i + 1}`,
        isActive:     true,
      },
    });

    await prisma.wallet.create({
      data: { userId: user.id, balance: 15000 + i * 5000, totalEarned: 50000 + i * 10000 },
    });

    // Certify in categories
    for (const catId of w.cats) {
      await prisma.userCategory.create({
        data: { userId: user.id, categoryId: catId, paidRegistration: true, isActive: true },
      });
      const attempt = await prisma.testAttempt.create({
        data: {
          userId: user.id, categoryId: catId,
          status: "CERTIFIED", scorePct: 75 + Math.random() * 20,
          passed: true, isRetry: false,
          startedAt: new Date(Date.now() - 30 * 86400_000),
          completedAt: new Date(Date.now() - 29 * 86400_000),
        },
      });
      const publicId = `CERT-${user.id.slice(-4).toUpperCase()}-${catId.slice(-4).toUpperCase()}`;
      await prisma.userCertificate.create({
        data: {
          publicId, userId: user.id, categoryId: catId,
          attemptId: attempt.id, score: Math.round(Number(attempt.scorePct)),
          certificateUrl: `https://bauin.com/certificates/${publicId}`,
          issuedAt: attempt.completedAt!,
        },
      });
    }

    workers.push({ id: user.id, name: user.name });
    console.log(`    ✔ ${w.name} — ${w.email} / Worker@2025!`);
  }
  console.log("  ✅ Workers created\n");

  // ── 5. Sellers + Stories + Episodes ──────────────────────────────
  console.log("  🛒 Creating sellers, stories & episodes...");

  const SELLERS = [
    { name: "TechMaster Pro",  email: "seller1@bauin.com" },
    { name: "BlockchainBoss",  email: "seller2@bauin.com" },
    { name: "GrowthHacker NG", email: "seller3@bauin.com" },
  ];

  const sellers: { id: string }[] = [];
  for (let i = 0; i < SELLERS.length; i++) {
    const s = SELLERS[i];
    const user = await prisma.user.create({
      data: {
        name:         s.name,
        email:        s.email,
        passwordHash: await hashPw("Seller@2025!"),
        role:         "SELLER",
        referralCode: nextRef("SLR"),
        kycStatus:    "APPROVED",
        rank:         "PLATINUM",
        phoneNumber:  `+23480000002${i + 1}`,
        isActive:     true,
      },
    });
    await prisma.wallet.create({
      data: { userId: user.id, balance: 85000 + i * 20000, totalEarned: 300000 + i * 50000 },
    });
    sellers.push({ id: user.id });
    console.log(`    ✔ ${s.name} — ${s.email} / Seller@2025!`);
  }

  for (const sd of STORY_DATA) {
    const sellerId = sellers[sd.sellerIdx].id;
    const story = await prisma.story.create({
      data: {
        title:       sd.title,
        description: sd.description,
        authorId:    sellerId,
        isPublished: true,
        isFree:      false,
        price:       sd.price,
        tags:        sd.tags,
      },
    });
    for (const ep of sd.episodes) {
      await prisma.episode.create({
        data: {
          storyId:         story.id,
          title:           ep.title,
          episodeNumber:   ep.num,
          description:     ep.desc,
          gameContentJson: makeGameContent(ep.title, sd.title),
          isFree:          ep.num === 1,
          price:           ep.num === 1 ? 0 : Math.round(sd.price * 0.3),
          isPublished:     true,
        },
      });
    }
  }
  console.log("  ✅ Sellers, stories & episodes created\n");

  // ── 6. Distributors + Collections + Quiz Sessions ────────────────
  console.log("  🎮 Creating distributors, collections & quiz sessions...");

  const DISTRIBUTORS = [
    { name: "Distributor One",   email: "dist1@bauin.com", code: "BAUIN-D10001" },
    { name: "Distributor Two",   email: "dist2@bauin.com", code: "BAUIN-D10002" },
    { name: "Distributor Three", email: "dist3@bauin.com", code: "BAUIN-D10003" },
    { name: "Distributor Four",  email: "dist4@bauin.com", code: "BAUIN-D10004" },
    { name: "Distributor Five",  email: "dist5@bauin.com", code: "BAUIN-D10005" },
  ];

  const COLLECTION_NAMES = [
    "The Hustle Quiz",
    "Data Dreams Live",
    "DeFi Masters",
    "Code to Wealth Quiz",
    "Marketing Blitz",
  ];

  for (let i = 0; i < DISTRIBUTORS.length; i++) {
    const d = DISTRIBUTORS[i];
    const user = await prisma.user.create({
      data: {
        name:         d.name,
        email:        d.email,
        passwordHash: await hashPw("Dist@2025!"),
        role:         "DISTRIBUTOR",
        referralCode: d.code,
        kycStatus:    "APPROVED",
        rank:         "DIAMOND",
        phoneNumber:  `+23480000003${i + 1}`,
        isActive:     true,
      },
    });
    await prisma.wallet.create({
      data: { userId: user.id, balance: 120000 + i * 15000, totalEarned: 500000 + i * 80000 },
    });

    const plc  = linkCode(`DIST${i}2025`);
    const coll = await prisma.distributorCollection.create({
      data: {
        userId:      user.id,
        name:        COLLECTION_NAMES[i],
        description: `Live quiz session hosted by ${d.name}`,
        publicLinkCode: plc,
        isInUse:     true,
        maxParticipants: 200,
      },
    });

    const startedAt = new Date(Date.now() - 2 * 3600_000); // 2h ago

    const qSession = await prisma.quizSession.create({
      data: {
        distributorCollectionId: coll.id,
        title:     COLLECTION_NAMES[i],
        status:    "ACTIVE",
        startedAt,
      },
    });

    // Add quiz entries from workers
    const rankOrder = workers.slice().sort(() => Math.random() - 0.5);
    for (let wi = 0; wi < rankOrder.length; wi++) {
      const w = rankOrder[wi];
      const p1 = 60 + Math.floor(Math.random() * 40);
      const p2 = 55 + Math.floor(Math.random() * 45);
      const p3 = 50 + Math.floor(Math.random() * 50);
      const p4 = 60 + Math.floor(Math.random() * 40);
      const p5 = 55 + Math.floor(Math.random() * 45);
      await prisma.quizEntry.create({
        data: {
          quizSessionId:  qSession.id,
          userId:         w.id,
          phase1Score:    p1,
          phase2Score:    p2,
          phase3Score:    p3,
          phase4Score:    p4,
          phase5Score:    p5,
          totalScore:     p1 + p2 + p3 + p4 + p5,
          rank:           wi + 1,
          completedAt:    new Date(Date.now() - 1800_000),
          minAnswerTimeMs: 1200 + Math.floor(Math.random() * 2000),
        },
      });
    }

    console.log(`    ✔ ${d.name} — ${d.email} / Dist@2025!  [link: ${plc}]`);
  }
  console.log("  ✅ Distributors, collections & sessions created\n");

  // ── 7. Platform Settings ─────────────────────────────────────────
  console.log("  ⚙️  Seeding platform settings...");

  const SETTINGS = [
    { key: "QUIZ_ENTRY_FEE",              value: "500",  description: "Entry fee per quiz session in NGN" },
    { key: "QUIZ_AUTO_CLOSE_HOURS",       value: "6",    description: "Hours before an ACTIVE quiz session auto-closes" },
    { key: "QUIZ_AUTO_CLOSE_PENDING_HOURS",value:"48",   description: "Hours before a PENDING session auto-closes" },
    { key: "REFERRAL_BONUS_PCT",          value: "10",   description: "Lifetime referral bonus percentage for workers" },
    { key: "AFFILIATE_BONUS_PER_REG",     value: "2000", description: "Flat bonus in NGN per successful affiliate referral" },
    { key: "VIEWER_REFERRAL_GOAL",        value: "30",   description: "Number of referrals a Viewer needs to unlock earnings" },
    { key: "WEEKLY_PRIZE_POOL_PCT",       value: "60",   description: "Percentage of entry fees contributed to weekly prize pool" },
    { key: "TOP1_MULTIPLIER",             value: "9",    description: "Bet multiplier for TOP1 prediction" },
    { key: "TOP3_MULTIPLIER",             value: "5",    description: "Bet multiplier for TOP3 prediction" },
    { key: "TOP5_MULTIPLIER",             value: "3",    description: "Bet multiplier for TOP5 prediction" },
    { key: "TOP10_MULTIPLIER",            value: "2",    description: "Bet multiplier for TOP10 prediction" },
    { key: "WITHDRAWAL_MIN_AMOUNT",       value: "5000", description: "Minimum withdrawal amount in NGN" },
    { key: "WITHDRAWAL_FEE_PCT",          value: "1.5",  description: "Withdrawal processing fee percentage" },
    { key: "STORY_PLATFORM_CUT_PCT",      value: "20",   description: "Platform commission percentage on story sales" },
    { key: "MAX_TOOL_POOL_CAPACITY",      value: "20",   description: "Maximum members allowed per tool pool" },
    { key: "KYC_AUTO_APPROVE_DAYS",       value: "90",   description: "Minimum account age in days for KYC auto-approval" },
  ];

  await prisma.platformSettings.createMany({ data: SETTINGS });
  console.log(`  ✅ ${SETTINGS.length} settings seeded\n`);

  // ── Summary ──────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log("  🎉  BAUIN database seeded successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`
  CREDENTIALS
  ───────────────────────────────────────────────────
  Super Admin : admin@bauin.com         / Admin@2025!
  Workers     : worker1-5@bauin.com     / Worker@2025!
  Sellers     : seller1-3@bauin.com     / Seller@2025!
  Distributors: dist1-5@bauin.com       / Dist@2025!
  ───────────────────────────────────────────────────
  `);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
