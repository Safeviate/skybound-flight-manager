'use client';

import React, { useEffect } from 'react';

export default function TrainingSchedulePage() {
  useEffect(() => {
    // Get references to the buttons and view containers
    const calendarBtn = document.getElementById('showCalendarBtn');
    const ganttBtn = document.getElementById('showGanttBtn');
    const calendarView = document.getElementById('calendarView');
    const ganttView = document.getElementById('ganttView');

    // Function to handle view switching
    function switchView(viewToShow: 'calendar' | 'gantt') {
        if (calendarView && ganttView && calendarBtn && ganttBtn) {
            if (viewToShow === 'calendar') {
                calendarView.style.display = 'block';
                ganttView.style.display = 'none';
                calendarBtn.classList.add('active');
                ganttBtn.classList.remove('active');
            } else {
                calendarView.style.display = 'none';
                ganttView.style.display = 'block';
                calendarBtn.classList.remove('active');
                ganttBtn.classList.add('active');
            }
        }
    }

    // Event listener for the calendar button
    calendarBtn?.addEventListener('click', () => switchView('calendar'));

    // Event listener for the Gantt chart button
    ganttBtn?.addEventListener('click', () => switchView('gantt'));

    // Cleanup function to remove event listeners
    return () => {
        calendarBtn?.removeEventListener('click', () => switchView('calendar'));
        ganttBtn?.removeEventListener('click', () => switchView('gantt'));
    };
  }, []);

  return (
    <>
      <style jsx>{`
        /* General Body and Font Styling */
        .container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #212529;
        }

        /* Button and Switcher Styling */
        .view-switcher {
            margin-bottom: 20px;
        }
        .view-switcher button {
            padding: 10px 15px;
            font-size: 16px;
            cursor: pointer;
            border: 1px solid #0d6efd;
            background-color: #ffffff;
            color: #0d6efd;
            border-radius: 5px;
            margin-right: 10px;
            transition: background-color 0.2s, color 0.2s;
        }
        .view-switcher button.active,
        .view-switcher button:hover {
            background-color: #0d6efd;
            color: #ffffff;
        }

        /* General Table Styling */
        table {
            width: 100%;
            border-collapse: collapse;
            background-color: #ffffff;
        }
        th, td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
            min-width: 80px; /* Set a min-width for time slots */
        }
        th {
            background-color: #e9ecef;
            text-align: center;
        }
        h2 {
            margin-top: 20px;
        }

        /* Gantt Chart Specific Styling */
        .gantt-container {
            overflow-x: auto; /* Enables horizontal scrolling */
            border: 1px solid #dee2e6;
            border-radius: 5px;
        }
        .gantt-table {
            width: 1800px; /* A wide table to demonstrate scrolling */
        }
        
        /* --- Sticky First Column --- */
        .gantt-table th:first-child,
        .gantt-table td:first-child {
            position: -webkit-sticky; /* For Safari */
            position: sticky;
            left: 0;
            z-index: 2; /* Ensures the sticky column is above other cells */
            background-color: #f1f3f5; /* A distinct background for the sticky column */
            width: 150px; /* Fixed width for the sticky column */
            min-width: 150px;
            text-align: left;
        }

        /* Ensure the table header is above the sticky column body cells */
        .gantt-table thead th {
            z-index: 3;
        }
        
        /* Gantt Bar Styling */
        .gantt-bar {
            background-color: #0d6efd;
            color: white;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
            font-size: 14px;
            white-space: nowrap;
        }
      `}</style>
      <div className="container">
        {/* View Switcher Buttons */}
        <div className="view-switcher">
            <button id="showCalendarBtn" className="active">Calendar View</button>
            <button id="showGanttBtn">Gantt Chart View</button>
        </div>

        {/* Calendar View Container */}
        <div id="calendarView">
            <h2>Monthly Calendar</h2>
            <table>
                <thead>
                    <tr>
                        <th>Sun</th>
                        <th>Mon</th>
                        <th>Tue</th>
                        <th>Wed</th>
                        <th>Thu</th>
                        <th>Fri</th>
                        <th>Sat</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td></td><td></td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>
                    <tr><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td></tr>
                    <tr><td>13</td><td>14</td><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td></tr>
                    <tr><td>20</td><td>21</td><td>22</td><td>23</td><td>24</td><td>25</td><td>26</td></tr>
                    <tr><td>27</td><td>28</td><td>29</td><td>30</td><td>31</td><td></td><td></td></tr>
                </tbody>
            </table>
        </div>

        {/* Gantt Chart View Container (initially hidden) */}
        <div id="ganttView" style={{ display: 'none' }}>
            <h2>Daily Schedule</h2>
            <div className="gantt-container">
                <table className="gantt-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>06:00</th>
                            <th>07:00</th>
                            <th>08:00</th>
                            <th>09:00</th>
                            <th>10:00</th>
                            <th>11:00</th>
                            <th>12:00</th>
                            <th>13:00</th>
                            <th>14:00</th>
                            <th>15:00</th>
                            <th>16:00</th>
                            <th>17:00</th>
                            <th>18:00</th>
                            <th>19:00</th>
                            <th>20:00</th>
                            <th>21:00</th>
                            <th>22:00</th>
                            <th>23:00</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td></td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </>
  );
}

TrainingSchedulePage.title = "Training Schedule";
