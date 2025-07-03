class HolidayCalendar {
    constructor() {
        this.currentDate = new Date();
        this.holidays = new Set();
        this.monthNames = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];
        this.dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        
        this.loadData();
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.renderCalendar();
    }
    
    bindEvents() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });
        
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportCalendar();
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearHolidays();
        });
        
        document.getElementById('closeBtn').addEventListener('click', () => {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('window-close');
        });
        
        document.getElementById('minimizeBtn').addEventListener('click', () => {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('window-minimize');
        });
        
        document.getElementById('monthYear').addEventListener('dblclick', () => {
            this.jumpToCurrentMonth();
        });
    }
    
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        document.getElementById('monthYear').textContent = `${year}年 ${this.monthNames[month]}`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';
        
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayElement = this.createDayElement(
                daysInPrevMonth - i, 
                year, 
                month - 1, 
                true
            );
            grid.appendChild(dayElement);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createDayElement(day, year, month, false);
            grid.appendChild(dayElement);
        }
        
        const totalCells = grid.children.length;
        const remainingCells = 42 - totalCells;
        
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(day, year, month + 1, true);
            grid.appendChild(dayElement);
        }
        
        this.updateCounters();
    }
    
    createDayElement(day, year, month, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const dateKey = `${year}-${month}-${day}`;
        const dayOfWeek = new Date(year, month, day).getDay();
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        } else {
            const today = new Date();
            if (year === today.getFullYear() && 
                month === today.getMonth() && 
                day === today.getDate()) {
                dayElement.classList.add('today');
            }
            
            if (dayOfWeek === 0) {
                dayElement.classList.add('weekend', 'sunday');
            } else if (dayOfWeek === 6) {
                dayElement.classList.add('weekend', 'saturday');
            }
            
            if (this.holidays.has(dateKey)) {
                dayElement.classList.add('holiday');
            }
            
            dayElement.addEventListener('click', () => {
                this.toggleHoliday(dateKey, dayElement);
            });
        }
        
        return dayElement;
    }
    
    toggleHoliday(dateKey, dayElement) {
        if (this.holidays.has(dateKey)) {
            this.holidays.delete(dateKey);
            dayElement.classList.remove('holiday');
        } else {
            this.holidays.add(dateKey);
            dayElement.classList.add('holiday');
        }
        this.saveData();
        this.updateCounters();
    }
    
    clearHolidays() {
        this.holidays.clear();
        this.saveData();
        this.renderCalendar();
        this.updateCounters();
    }
    
    async exportCalendar() {
        try {
            const exportContainer = this.createExportContainer();
            document.body.appendChild(exportContainer);
            
            const canvas = await html2canvas(exportContainer, {
                backgroundColor: '#ffffff',
                width: 1000,
                height: 1000,
                scale: 1,
                useCORS: true
            });
            
            document.body.removeChild(exportContainer);
            
            canvas.toBlob(async (blob) => {
                try {
                    const { clipboard } = require('electron');
                    const fs = require('fs');
                    const path = require('path');
                    const os = require('os');
                    
                    const year = this.currentDate.getFullYear();
                    const month = this.currentDate.getMonth();
                    const fileName = `${year}年${String(month + 1).padStart(2, '0')}月予定表.png`;
                    const tempPath = path.join(os.tmpdir(), fileName);
                    const buffer = await blob.arrayBuffer();
                    fs.writeFileSync(tempPath, Buffer.from(buffer));
                    
                    clipboard.writeImage(tempPath);
                    
                    fs.unlinkSync(tempPath);
                    
                    this.showSaveAnimation();
                } catch (error) {
                    console.error('クリップボードへのコピーに失敗:', error);
                    alert('💔 保存に失敗しました...');
                }
            }, 'image/png');
            
        } catch (error) {
            console.error('エクスポートエラー:', error);
            alert('💔 エクスポートに失敗しました...');
        }
    }
    
    saveData() {
        try {
            const data = {
                holidays: Array.from(this.holidays),
                currentDate: this.currentDate.toISOString()
            };
            localStorage.setItem('holidayCalendarData', JSON.stringify(data));
        } catch (error) {
            console.error('データの保存に失敗:', error);
        }
    }
    
    loadData() {
        try {
            const savedData = localStorage.getItem('holidayCalendarData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.holidays = new Set(data.holidays || []);
                if (data.currentDate) {
                    this.currentDate = new Date(data.currentDate);
                }
            }
        } catch (error) {
            console.error('データの読み込みに失敗:', error);
        }
    }
    
    updateCounters() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let holidayCount = 0;
        let jobdayCount = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${month}-${day}`;
            const dayOfWeek = new Date(year, month, day).getDay();
            
            if (this.holidays.has(dateKey)) {
                holidayCount++;
            } else if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                jobdayCount++;
            }
        }
        
        document.getElementById('holidayCount').textContent = holidayCount;
        document.getElementById('jobdayCount').textContent = jobdayCount;
    }
    
    jumpToCurrentMonth() {
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.renderCalendar();
        this.saveData();
    }
    
    showSaveAnimation() {
        const saveBtn = document.getElementById('exportBtn');
        const originalText = saveBtn.textContent;
        
        // ボタンを無効化
        saveBtn.disabled = true;
        saveBtn.style.pointerEvents = 'none';
        saveBtn.textContent = '✨ 保存完了！ 🌸';
        saveBtn.style.animation = 'saveSuccess 0.6s ease-in-out';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.animation = '';
            saveBtn.disabled = false;
            saveBtn.style.pointerEvents = 'auto';
        }, 2000);
    }
    
    createExportContainer() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        const container = document.createElement('div');
        container.className = 'export-calendar-container';
        container.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            width: 1000px;
            height: 1000px;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 60px;
            box-sizing: border-box;
        `;
        
        // 年月表示
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            font-size: 48px;
            font-weight: 300;
            color: #333;
            margin-bottom: 40px;
            letter-spacing: 2px;
        `;
        header.textContent = `${year}年 ${this.monthNames[month]}`;
        container.appendChild(header);
        
        // カレンダーコンテナ
        const calendarWrapper = document.createElement('div');
        calendarWrapper.style.cssText = `
            width: 100%;
            height: calc(100% - 120px);
        `;
        
        // 曜日ヘッダー
        const dayHeaders = document.createElement('div');
        dayHeaders.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            margin-bottom: 10px;
        `;
        
        this.dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.style.cssText = `
                text-align: center;
                font-size: 24px;
                font-weight: 500;
                color: #666;
                padding: 15px 0;
            `;
            dayHeader.textContent = dayName;
            dayHeaders.appendChild(dayHeader);
        });
        calendarWrapper.appendChild(dayHeaders);
        
        // カレンダーグリッド
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            grid-template-rows: repeat(6, 1fr);
            gap: 2px;
            height: calc(100% - 80px);
        `;
        
        // 前月の日付
        const prevMonth = new Date(year, month - 1, 0);
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const dayElement = this.createExportDayElement(
                daysInPrevMonth - i, 
                year, 
                month - 1, 
                true
            );
            grid.appendChild(dayElement);
        }
        
        // 当月の日付
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = this.createExportDayElement(day, year, month, false);
            grid.appendChild(dayElement);
        }
        
        // 次月の日付
        const totalCells = grid.children.length;
        const remainingCells = 42 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createExportDayElement(day, year, month + 1, true);
            grid.appendChild(dayElement);
        }
        
        calendarWrapper.appendChild(grid);
        container.appendChild(calendarWrapper);
        
        return container;
    }
    
    createExportDayElement(day, year, month, isOtherMonth) {
        const dayElement = document.createElement('div');
        const dateKey = `${year}-${month}-${day}`;
        const dayOfWeek = new Date(year, month, day).getDay();
        const isHoliday = this.holidays.has(dateKey);
        const isWorkDay = !isOtherMonth && !isHoliday && dayOfWeek !== 0 && dayOfWeek !== 6;
        
        dayElement.style.cssText = `
            position: relative;
            border: 1px solid #eee;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 400;
            background: white;
        `;
        
        if (isOtherMonth) {
            dayElement.style.color = '#ddd';
        } else if (isHoliday) {
            dayElement.style.color = '#f56565';
            dayElement.style.fontWeight = '600';
            dayElement.style.backgroundImage = `
                linear-gradient(45deg, transparent 48%, rgba(245, 101, 101, 0.8) 49.5%, rgba(245, 101, 101, 0.8) 50.5%, transparent 52%),
                linear-gradient(-45deg, transparent 48%, rgba(245, 101, 101, 0.8) 49.5%, rgba(245, 101, 101, 0.8) 50.5%, transparent 52%)
            `;
            dayElement.style.backgroundSize = '100% 100%';
            dayElement.style.backgroundRepeat = 'no-repeat';
        } else if (isWorkDay) {
            dayElement.style.color = '#74b9ff';
            dayElement.style.fontWeight = '500';
        } else {
            dayElement.style.color = '#7f8c8d';
        }
        
        dayElement.textContent = day;
        return dayElement;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HolidayCalendar();
});