import { expect, test } from '@playwright/test';
test('ECDS sign-in button is keyboard accessible and stable', async ({page},testInfo)=>{
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/sign-in');
 const button=page.getByRole('button',{name:'Continue with Google'});
 await expect(button).toBeVisible();
 await expect(button).toHaveAttribute('type','submit');
 await expect(button).toBeEnabled();
 await page.keyboard.press('Tab');
 await expect(button).toBeFocused();
 await page.evaluate(()=>document.fonts.ready);
 const first=await button.screenshot({animations:'disabled'});
 const second=await button.screenshot({animations:'disabled'});
 expect(first.equals(second)).toBeTruthy();
 await testInfo.attach('sign-in',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 expect(errors).toEqual([]);
});
