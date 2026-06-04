## Application Design

The TriCoach platform is designed to provide a comprehensive, end-to-end training experience for triathletes. The core functional requirements are divided into distinct domains, each handled by its respective microservice.

### User & Profile Management

* **Onboarding & Authentication**: Secure registration and login.
* **Athlete Profiling**: Tracking physical metrics (age, weight, height) and experience level (from beginner to professional) to tailor training plans.
* **System Preferences**: Managing user-specific settings such as UI themes (dark mode).

### Training & Workout Management

* **Activity Logging**: Manual tracking of the three core triathlon disciplines: swimming, cycling, and running.
* **Training Plans**: Creating and managing structured plans with specific target distances and goal dates.

### Performance Analytics

* **Progress Tracking**: Calculating weekly and monthly trends across all three disciplines.
* **Milestones & Achievements**: Automatically recognizing and highlighting personal bests and completed training plan milestones.

### Social Community

* **Interactive Feed**: A personalized timeline displaying workouts and text updates from followed athletes.
* **Engagement**: The ability to like posts to encourage community support.
* **Athlete Networking**: A following system to connect with friends.

### Race Day Simulation

* **Predictive Modeling with AI**: Using historical training data connected with LLM API to estimate finish times for standard triathlon distances (Sprint, Olympic, Half-Ironman, Ironman).