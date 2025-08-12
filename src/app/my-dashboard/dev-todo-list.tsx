'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export function DevTodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
        const storedTodos = localStorage.getItem('dev-todos');
        if (storedTodos) {
            setTodos(JSON.parse(storedTodos));
        }
    } catch (error) {
        console.warn("Could not retrieve dev to-do list from localStorage.");
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
        try {
            localStorage.setItem('dev-todos', JSON.stringify(todos));
        } catch (error) {
            console.warn("Could not save dev to-do list to localStorage.");
        }
    }
  }, [todos, isMounted]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;
    const newTodo: TodoItem = {
      id: Date.now(),
      text: inputValue,
      completed: false,
    };
    setTodos([...todos, newTodo]);
    setInputValue('');
  };

  const handleToggleTodo = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
  
  const handleClearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  }

  return (
    <Card className="mt-6 border-primary/20">
      <CardHeader>
        <CardTitle>Development To-Do List</CardTitle>
        <CardDescription>
          A simple checklist for development tasks. This will not appear in production.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new task..."
          />
          <Button type="submit" variant="outline" size="icon">
            <PlusCircle />
          </Button>
        </form>
        <ScrollArea className="h-60 pr-4">
          <div className="space-y-2">
            {todos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
              >
                <Checkbox
                  id={`todo-${todo.id}`}
                  checked={todo.completed}
                  onCheckedChange={() => handleToggleTodo(todo.id)}
                />
                <label
                  htmlFor={`todo-${todo.id}`}
                  className={`flex-1 text-sm ${
                    todo.completed ? 'text-muted-foreground line-through' : ''
                  }`}
                >
                  {todo.text}
                </label>
              </div>
            ))}
             {todos.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-4">No tasks yet. Add one above!</p>
            )}
          </div>
        </ScrollArea>
        {todos.some(todo => todo.completed) && (
             <div className="flex justify-end mt-4">
                <Button variant="destructive" size="sm" onClick={handleClearCompleted}>
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Clear Completed
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
