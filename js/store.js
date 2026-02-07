/**
 * Simple Store based on Pub/Sub pattern
 */
const store = {
    state: {
        currentPage: 'dashboard',
        problems: [],
        currentProblemIndex: 0,
        userAnswers: {},
        examMode: 'practice', // 'practice' or 'real'
        autoAdvance: false,
        isEditMode: false,
        workbookTitle: '',
    },
    listeners: [],

    getState() {
        return this.state;
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    },

    // Exam Specific Actions
    startExam(problems, mode, workbookTitle) {
        this.setState({
            problems: problems,
            currentProblemIndex: 0,
            userAnswers: {}, // { problemId: answerIndex }
            examMode: mode, // 'practice', 'real'
            examStatus: 'running', // 'running', 'finished'
            timeLeft: mode === 'real' ? 90 * 60 : 0, // 90 minutes for real exam
            workbookTitle: workbookTitle || '문제 풀이'
        });
    },

    selectAnswer(problemId, answerIndex) {
        const { userAnswers, autoAdvance } = this.state;
        this.setState({
            userAnswers: { ...userAnswers, [problemId]: answerIndex }
        });

        if (autoAdvance) {
            setTimeout(() => {
                this.nextProblem();
            }, 300);
        }
    },

    nextProblem() {
        const { currentProblemIndex, problems } = this.state;
        if (currentProblemIndex < problems.length - 1) {
            this.setState({ currentProblemIndex: currentProblemIndex + 1 });
        }
    },

    prevProblem() {
        const { currentProblemIndex } = this.state;
        if (currentProblemIndex > 0) {
            this.setState({ currentProblemIndex: currentProblemIndex - 1 });
        }
    },

    jumpToProblem(index) {
        this.setState({ currentProblemIndex: index });
    },

    toggleAutoAdvance(enabled) {
        this.setState({ autoAdvance: enabled });
    },

    toggleEditMode(enabled) {
        this.setState({ isEditMode: enabled });
    },

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
};
