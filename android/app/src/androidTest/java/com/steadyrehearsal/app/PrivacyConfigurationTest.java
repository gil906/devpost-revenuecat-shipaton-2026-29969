package com.steadyrehearsal.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class PrivacyConfigurationTest {
    @Test
    public void localPracticeIsNotIncludedInCloudBackup() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.steadyrehearsal.app", context.getPackageName());
        assertFalse((context.getApplicationInfo().flags & ApplicationInfo.FLAG_ALLOW_BACKUP) != 0);
    }

    @Test
    public void paymentVerificationCanReturnToSingleTopActivity() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ActivityInfo activity = context.getPackageManager().getActivityInfo(
            new ComponentName(context, MainActivity.class), 0
        );
        assertEquals(ActivityInfo.LAUNCH_SINGLE_TOP, activity.launchMode);
    }
}
