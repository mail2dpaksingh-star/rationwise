/* RationWise v1.1: simplex LP core retained from archived v1.0.
   The new engineering layer handles as-fed / dry-matter transformations.
   Use is mathematical only; no nutritional claims. */
(function(root){
'use strict';
const EPS=1e-8;
  class LPSolver {
    constructor(A,b,c) {
      this.m=b.length; this.n=c.length;
      const {m,n}=this;
      this.B=Array(m); this.N=Array(n+1);
      this.D=Array.from({length:m+2},()=>Array(n+2).fill(0));
      for(let i=0;i<m;i++) {
        for(let j=0;j<n;j++) this.D[i][j]=A[i][j];
        this.B[i]=n+i; this.D[i][n]=-1; this.D[i][n+1]=b[i];
      }
      for(let j=0;j<n;j++) { this.N[j]=j; this.D[m][j]=-c[j]; }
      this.N[n]=-1; this.D[m+1][n]=1;
    }
    pivot(r,s) {
      const {D,m,n,B,N}=this;
      let inv=1/D[r][s];
      for(let i=0;i<m+2;i++) if(i!==r)
        for(let j=0;j<n+2;j++) if(j!==s)
          D[i][j] -= D[r][j]*D[i][s]*inv;
      for(let j=0;j<n+2;j++) if(j!==s) D[r][j]*=inv;
      for(let i=0;i<m+2;i++) if(i!==r) D[i][s]*=-inv;
      D[r][s]=inv;
      const temp=B[r];B[r]=N[s];N[s]=temp;
    }
    simplex(phase) {
      const {D,B,N,m,n}=this;
      const row = phase===1 ? m+1 : m;
      for(let k=0;k<30000;k++) {
        let s=-1;
        for(let j=0;j<=n;j++) {
          if(phase===2 && N[j]===-1) continue;
          if(s===-1 || D[row][j] < D[row][s]-EPS ||
              (Math.abs(D[row][j]-D[row][s])<=EPS && N[j]<N[s])) s=j;
        }
        if(s===-1 || D[row][s]>=-EPS) return true;
        let r=-1;
        for(let i=0;i<m;i++) {
          if(D[i][s]<=EPS) continue;
          let ratio=D[i][n+1]/D[i][s];
          if(r===-1 || ratio < D[r][n+1]/D[r][s]-EPS ||
            (Math.abs(ratio-D[r][n+1]/D[r][s])<=EPS && B[i]<B[r])) r=i;
        }
        if(r===-1) return false;
        this.pivot(r,s);
      }
      throw new Error('Optimization iteration limit reached');
    }
    solve(){
      const {D,B,N,m,n}=this;
      let r=0;
      for(let i=1;i<m;i++) if(D[i][n+1]<D[r][n+1]) r=i;
      if(m && D[r][n+1]<-EPS) {
        this.pivot(r,n);
        if(!this.simplex(1) || D[m+1][n+1]<-EPS || D[m+1][n+1]>EPS)
          return {status:'infeasible'};
        for(let i=0;i<m;i++) if(B[i]===-1){
          let s=0;
          for(let j=1;j<=n;j++)
            if(D[i][j]<D[i][s]-EPS ||
               (Math.abs(D[i][j]-D[i][s])<=EPS && N[j]<N[s])) s=j;
          this.pivot(i,s);
        }
      }
      if(!this.simplex(2)) return {status:'unbounded'};
      let x=Array(n).fill(0);
      for(let i=0;i<m;i++) if(B[i]>=0 && B[i]<n) x[B[i]]=D[i][n+1];
      return {status:'optimal', values:x, objective:D[m][n+1]};
    }
  }

const API={LPSolver};
root.RationLP=API;
if(typeof module!=="undefined" && module.exports)module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
