/**
 * Main Application Entry Point
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Mock Data
    if (!api.isProduction && api.init) {
        api.init();
    }

    // Load saved D-Day from localStorage
    const savedDDay = localStorage.getItem('cbt_dday');
    if (savedDDay && MOCK_DATA.user) {
        MOCK_DATA.user.settings.dDay = savedDDay;
    }

    console.log('App Initialized');

    // Initialize Router
    router.init();

    // Event Listeners for Sidebar Navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            const page = e.currentTarget.dataset.page;
            const state = store.getState();

            // 시험 중이면 이탈 확인 모달 표시
            if (state.examStatus === 'running') {
                const confirmed = await UI.modal.confirm('시험 중 화면을 이탈하면 시험이 종료됩니다.\n정말로 나가시겠습니까?');
                if (confirmed) {
                    store.setState({ examStatus: 'finished' });
                    Exam.stopTimer();
                    router.navigate(page);
                }
                return;
            }

            router.navigate(page);
        });
    });
});

/**
 * UI Utilities
 */
const UI = {
    modal: {
        show(title, content, buttons) {
            const overlay = document.getElementById('modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const contentEl = document.getElementById('modal-content');
            const actionsEl = document.getElementById('modal-actions');

            titleEl.textContent = title;
            contentEl.textContent = content;
            actionsEl.innerHTML = '';

            buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `btn ${btn.primary ? 'btn-primary' : ''}`;
                button.style.border = btn.primary ? 'none' : '1px solid var(--border-color)';
                button.textContent = btn.text;
                button.onclick = () => {
                    this.hide();
                    if (btn.onClick) btn.onClick();
                };
                actionsEl.appendChild(button);
            });

            overlay.classList.remove('hidden');
        },

        hide() {
            document.getElementById('modal-overlay').classList.add('hidden');
        },

        alert(content) {
            return new Promise((resolve) => {
                this.show('알림', content, [
                    { text: '확인', primary: true, onClick: resolve }
                ]);
            });
        },

        confirm(content) {
            return new Promise((resolve) => {
                this.show('확인', content, [
                    { text: '취소', primary: false, onClick: () => resolve(false) },
                    { text: '확인', primary: true, onClick: () => resolve(true) }
                ]);
            });
        }
    }
};
