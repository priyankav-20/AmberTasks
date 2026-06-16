

document.addEventListener('DOMContentLoaded', () => {



  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';


  const todoForm = document.getElementById('todo-form');
  const taskInput = document.getElementById('task-input');
  const taskPriority = document.getElementById('task-priority');
  const todoList = document.getElementById('todo-list');
  const itemsCounter = document.getElementById('items-counter');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const emptyState = document.getElementById('empty-state');






  function getFormattedTimestamp() {
    const now = new Date();
    const options = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return now.toLocaleDateString('en-US', options);
  }


  function loadLocalStorage() {
    try {
      const storedTasks = localStorage.getItem('amber_tasks');
      tasks = storedTasks ? JSON.parse(storedTasks) : [];


      const isDarkMode = localStorage.getItem('amber_tasks_dark_mode') === 'true';
      if (isDarkMode) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    } catch (e) {
      console.error('Failed to load tasks from local storage:', e);
      tasks = [];
    }
  }


  function saveToLocalStorage() {
    try {
      localStorage.setItem('amber_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to local storage:', e);
    }
  }


  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }






  function addTask(text, priority) {
    const cleanedText = text.trim();
    if (!cleanedText) return;

    const newTask = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      text: cleanedText,
      completed: false,
      priority: priority,
      createdAt: getFormattedTimestamp()
    };

    tasks.push(newTask);
    saveToLocalStorage();
    renderTasks();
  }


  function toggleTaskComplete(id) {
    tasks = tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    saveToLocalStorage();
    renderTasks();
  }


  function updateTaskDetails(id, updatedText, updatedPriority) {
    const cleanedText = updatedText.trim();
    if (!cleanedText) {

      deleteTask(id);
      return;
    }

    tasks = tasks.map(task => {
      if (task.id === id) {
        return { ...task, text: cleanedText, priority: updatedPriority };
      }
      return task;
    });
    saveToLocalStorage();
    renderTasks();
  }


  function deleteTask(id) {
    const taskElement = document.querySelector(`[data-id="${id}"]`);
    if (taskElement) {
      taskElement.classList.add('slide-out');
      taskElement.addEventListener('animationend', () => {
        tasks = tasks.filter(task => task.id !== id);
        saveToLocalStorage();
        renderTasks();
      });
    } else {
      tasks = tasks.filter(task => task.id !== id);
      saveToLocalStorage();
      renderTasks();
    }
  }


  function clearAllCompleted() {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;


    let animationPromises = [];

    completedTasks.forEach(task => {
      const el = document.querySelector(`[data-id="${task.id}"]`);
      if (el) {
        el.classList.add('slide-out');
        const p = new Promise(resolve => {
          el.addEventListener('animationend', resolve, { once: true });
        });
        animationPromises.push(p);
      }
    });

    if (animationPromises.length > 0) {
      Promise.all(animationPromises).then(() => {
        tasks = tasks.filter(task => !task.completed);
        saveToLocalStorage();
        renderTasks();
      });
    } else {
      tasks = tasks.filter(task => !task.completed);
      saveToLocalStorage();
      renderTasks();
    }
  }


  function reorderTasksFromDOM() {
    const DOMItems = [...todoList.querySelectorAll('.todo-item')];
    const newOrderedTasks = [];

    DOMItems.forEach(item => {
      const taskId = item.dataset.id;
      const foundTask = tasks.find(t => t.id === taskId);
      if (foundTask) {
        newOrderedTasks.push(foundTask);
      }
    });


    const hiddenTasks = tasks.filter(t => !newOrderedTasks.some(nt => nt.id === t.id));

    tasks = [...newOrderedTasks, ...hiddenTasks];
    saveToLocalStorage();


    renderTasks();
  }





  function renderTasks() {

    todoList.innerHTML = '';


    let filteredTasks = tasks.filter(task => {

      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'completed') return task.completed;
      return true;
    }).filter(task => {

      return task.text.toLowerCase().includes(searchQuery.toLowerCase());
    });


    const activeTasksCount = tasks.filter(t => !t.completed).length;
    itemsCounter.textContent = `${activeTasksCount} ${activeTasksCount === 1 ? 'item' : 'items'} left`;


    if (filteredTasks.length === 0) {
      emptyState.style.display = 'flex';


      const titleEl = emptyState.querySelector('.empty-state-title');
      const subEl = emptyState.querySelector('.empty-state-subtitle');

      if (searchQuery.trim() !== '') {
        titleEl.textContent = 'No Matches Found';
        subEl.textContent = 'Try adjusting your search terms or filters.';
      } else if (currentFilter === 'active') {
        titleEl.textContent = 'No Active Tasks';
        subEl.textContent = 'Enjoy the peace of mind! Or write down a new goal.';
      } else if (currentFilter === 'completed') {
        titleEl.textContent = 'No Completed Tasks';
        subEl.textContent = 'Mark a task as completed to see it listed here.';
      } else {
        titleEl.textContent = 'All Caught Up!';
        subEl.textContent = 'Your to-do list is empty. Add a task to start organizing your day.';
      }
    } else {
      emptyState.style.display = 'none';
    }


    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `todo-item ${task.completed ? 'completed' : ''}`;
      li.dataset.id = task.id;


      li.addEventListener('dragstart', handleDragStart);
      li.addEventListener('dragend', handleDragEnd);


      const dragHandle = document.createElement('div');
      dragHandle.className = 'drag-handle';
      dragHandle.title = 'Drag to reorder';
      dragHandle.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="9" x2="16" y2="9"></line>
          <line x1="8" y1="15" x2="16" y2="15"></line>
        </svg>
      `;

      dragHandle.addEventListener('mousedown', () => {
        li.setAttribute('draggable', 'true');
      });
      dragHandle.addEventListener('mouseup', () => {
        li.setAttribute('draggable', 'false');
      });

      dragHandle.addEventListener('touchstart', () => {
        li.setAttribute('draggable', 'true');
      });
      dragHandle.addEventListener('touchend', () => {
        li.setAttribute('draggable', 'false');
      });


      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'todo-item-content';


      const checkboxLabel = document.createElement('label');
      checkboxLabel.className = 'checkbox-container';
      checkboxLabel.ariaLabel = `Mark task "${task.text}" as ${task.completed ? 'active' : 'complete'}`;

      const checkboxInput = document.createElement('input');
      checkboxInput.type = 'checkbox';
      checkboxInput.checked = task.completed;
      checkboxInput.addEventListener('change', () => toggleTaskComplete(task.id));

      const checkmarkSpan = document.createElement('span');
      checkmarkSpan.className = 'checkmark';

      checkmarkSpan.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

      checkboxLabel.appendChild(checkboxInput);
      checkboxLabel.appendChild(checkmarkSpan);


      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'todo-details';

      const textWrapper = document.createElement('div');
      textWrapper.className = 'todo-text-wrapper';

      const textSpan = document.createElement('span');
      textSpan.className = 'todo-text';
      textSpan.textContent = task.text;


      textSpan.addEventListener('dblclick', () => startEditing(task.id, detailsDiv, task.text, task.priority));

      textWrapper.appendChild(textSpan);


      const metaDiv = document.createElement('div');
      metaDiv.className = 'todo-meta';


      const priorityBadge = document.createElement('span');
      priorityBadge.className = `priority-badge ${task.priority}`;
      priorityBadge.textContent = task.priority;
      metaDiv.appendChild(priorityBadge);


      const timeSpan = document.createElement('span');
      timeSpan.className = 'todo-time';
      timeSpan.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>${task.createdAt}</span>
      `;
      metaDiv.appendChild(timeSpan);

      detailsDiv.appendChild(textWrapper);
      detailsDiv.appendChild(metaDiv);

      contentWrapper.appendChild(checkboxLabel);
      contentWrapper.appendChild(detailsDiv);


      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'todo-actions';


      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon btn-edit';
      editBtn.type = 'button';
      editBtn.title = 'Edit task';
      editBtn.ariaLabel = `Edit task: ${task.text}`;
      editBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;
      editBtn.addEventListener('click', () => startEditing(task.id, detailsDiv, task.text, task.priority));


      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon btn-delete';
      deleteBtn.type = 'button';
      deleteBtn.title = 'Delete task';
      deleteBtn.ariaLabel = `Delete task: ${task.text}`;
      deleteBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => deleteTask(task.id));

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);


      li.appendChild(dragHandle);
      li.appendChild(contentWrapper);
      li.appendChild(actionsDiv);

      todoList.appendChild(li);
    });
  }


  function startEditing(id, detailsContainer, text, priority) {

    if (detailsContainer.querySelector('.edit-task-input')) return;

    const originalTextWrapper = detailsContainer.querySelector('.todo-text-wrapper');
    const originalMeta = detailsContainer.querySelector('.todo-meta');


    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.style.width = '100%';
    editContainer.style.display = 'flex';
    editContainer.style.flexDirection = 'column';
    editContainer.style.gap = '8px';

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-task-input';
    editInput.value = text;
    editContainer.appendChild(editInput);


    const editPriorityWrapper = document.createElement('div');
    editPriorityWrapper.className = 'priority-wrapper';
    editPriorityWrapper.style.maxWidth = '150px';

    const editPrioritySelect = document.createElement('select');
    editPrioritySelect.id = `edit-priority-${id}`;
    editPrioritySelect.ariaLabel = 'Update priority';
    editPrioritySelect.style.height = '32px';
    editPrioritySelect.style.fontSize = '12px';
    editPrioritySelect.style.padding = '0 10px';
    editPrioritySelect.innerHTML = `
      <option value="low" ${priority === 'low' ? 'selected' : ''}>Low Priority</option>
      <option value="medium" ${priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
      <option value="high" ${priority === 'high' ? 'selected' : ''}>High Priority</option>
    `;
    editPriorityWrapper.appendChild(editPrioritySelect);
    editContainer.appendChild(editPriorityWrapper);


    const finishEditing = () => {
      const newText = editInput.value.trim();
      const newPriority = editPrioritySelect.value;
      updateTaskDetails(id, newText, newPriority);
    };

    const cancelEditing = () => {

      detailsContainer.innerHTML = '';
      detailsContainer.appendChild(originalTextWrapper);
      detailsContainer.appendChild(originalMeta);
    };


    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishEditing();
      } else if (e.key === 'Escape') {
        cancelEditing();
      }
    });



    let isBlurring = false;
    const handleBlur = () => {
      setTimeout(() => {

        const activeElement = document.activeElement;
        if (activeElement !== editInput && activeElement !== editPrioritySelect) {
          finishEditing();
        }
      }, 100);
    };

    editInput.addEventListener('blur', handleBlur);
    editPrioritySelect.addEventListener('blur', handleBlur);


    detailsContainer.innerHTML = '';
    detailsContainer.appendChild(editContainer);


    editInput.focus();
    editInput.select();
  }




  let draggingElement = null;

  function handleDragStart(e) {
    draggingElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
  }

  function handleDragEnd() {
    this.classList.remove('dragging');
    draggingElement = null;
    reorderTasksFromDOM();
  }


  todoList.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggingElement) return;

    const siblings = [...todoList.querySelectorAll('.todo-item:not(.dragging)')];


    const nextSibling = siblings.find(sibling => {
      const box = sibling.getBoundingClientRect();
      const offset = e.clientY - box.top - box.height / 2;
      return offset < 0;
    });


    if (nextSibling) {
      todoList.insertBefore(draggingElement, nextSibling);
    } else {
      todoList.appendChild(draggingElement);
    }
  });










  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value;
    const priority = taskPriority.value;

    addTask(text, priority);


    taskInput.value = '';
    taskPriority.value = 'medium';
    taskInput.focus();
  });


  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;

    if (searchQuery.trim() !== '') {
      clearSearchBtn.style.display = 'flex';
    } else {
      clearSearchBtn.style.display = 'none';
    }

    renderTasks();
  });


  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderTasks();
    searchInput.focus();
  });


  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {

      filterTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');

      currentFilter = e.target.dataset.filter;
      renderTasks();
    });
  });


  clearCompletedBtn.addEventListener('click', () => {
    clearAllCompleted();
  });


  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('amber_tasks_dark_mode', isDark);
  });


  document.addEventListener('keydown', (e) => {

    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      searchInput.focus();
    }

    if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderTasks();
      searchInput.blur();
    }
  });




  loadLocalStorage();
  renderTasks();
});

