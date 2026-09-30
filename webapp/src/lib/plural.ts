/** Russian plural form: plural(5,'день','дня','дней') → 'дней'. */
export function plural(n:number,one:string,few:string,many:string){
  const a=Math.abs(n)%100,b=a%10;
  return a>10&&a<20?many:b===1?one:b>=2&&b<=4?few:many;
}
export const count=(n:number,one:string,few:string,many:string)=>n+' '+plural(n,one,few,many);
