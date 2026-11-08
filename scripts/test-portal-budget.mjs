import assert from'node:assert/strict';
import{assertPortalFileBudget}from'../portal/build-budget.mjs';
assert.equal(assertPortalFileBudget([{path:'/'}],['robots.txt']),3);
assert.throws(()=>assertPortalFileBudget([{path:'/'},{path:'/'}],[]),/Duplicate/);
assert.throws(()=>assertPortalFileBudget(Array.from({length:19999},(_,i)=>({path:'/game-'+i+'/'})),[]),/20000/);
assert.equal(assertPortalFileBudget(Array.from({length:19998},(_,i)=>({path:'/game-'+i+'/'})),[]),19999);
console.log('PASS exact pre-build file count, duplicate paths and strict hosting ceiling');
